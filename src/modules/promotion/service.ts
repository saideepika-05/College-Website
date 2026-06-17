import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, sections, students, user } from "@/db/schema";
import { audit } from "@/lib/audit";
import { actionError } from "@/lib/safe-action";
import { YEAR_LEVELS } from "@/lib/labels";

function nextYearLevel(
  y: (typeof YEAR_LEVELS)[number],
): (typeof YEAR_LEVELS)[number] | null {
  const i = YEAR_LEVELS.indexOf(y);
  return i >= 0 && i < YEAR_LEVELS.length - 1 ? YEAR_LEVELS[i + 1]! : null;
}

/** Students actively enrolled in a section, with their identities. */
export async function listSectionRoster(sectionId: string) {
  return db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      name: user.name,
      enrollmentId: enrollments.id,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(user, eq(students.userId, user.id))
    .where(
      and(eq(enrollments.sectionId, sectionId), eq(enrollments.status, "ACTIVE")),
    )
    .orderBy(students.rollNumber);
}

export type PromotionResult = {
  promoted: number;
  skipped: { rollNumber: string; reason: string }[];
};

/**
 * Bulk promotion: each selected student gets a NEW enrollment row in the
 * destination section's session; the source enrollment flips to PROMOTED.
 * History is never overwritten (SRS §21–22).
 */
export async function promoteStudents(
  actorId: string,
  input: { fromSectionId: string; toSectionId: string; studentIds: string[] },
): Promise<PromotionResult> {
  if (input.fromSectionId === input.toSectionId) {
    actionError("Source and destination sections are the same.");
  }

  const [from] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.fromSectionId));
  const [to] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.toSectionId));
  if (!from || !to) actionError("Section not found.");
  if (!to!.isActive) actionError("Destination section is inactive.");
  if (from!.departmentId !== to!.departmentId) {
    actionError("Promotion across departments is not allowed.");
  }
  if (to!.academicSessionId === from!.academicSessionId) {
    actionError(
      "Destination must be in a different academic session (use Transfer for same-session moves).",
    );
  }
  const expected = nextYearLevel(from!.yearLevel);
  if (!expected) {
    actionError(
      "4th-year students cannot be promoted — mark them as completed instead.",
    );
  }
  if (to!.yearLevel !== expected) {
    actionError(
      `Destination section must be a ${expected!.replace("YEAR_", "")}th-year section.`,
    );
  }

  // Source enrollments for the selected students.
  const sourceEnrollments = await db
    .select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      rollNumber: students.rollNumber,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(
      and(
        eq(enrollments.sectionId, input.fromSectionId),
        eq(enrollments.status, "ACTIVE"),
        inArray(enrollments.studentId, input.studentIds),
      ),
    );

  // Students already enrolled in the destination session are skipped.
  const existingInTarget = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.academicSessionId, to!.academicSessionId),
        inArray(
          enrollments.studentId,
          sourceEnrollments.map((e) => e.studentId),
        ),
      ),
    );
  const alreadyThere = new Set(existingInTarget.map((e) => e.studentId));

  const skipped: PromotionResult["skipped"] = [];
  const found = new Set(sourceEnrollments.map((e) => e.studentId));
  for (const sid of input.studentIds) {
    if (!found.has(sid)) {
      skipped.push({
        rollNumber: sid,
        reason: "No active enrollment in the source section",
      });
    }
  }

  const toPromote = sourceEnrollments.filter((e) => {
    if (alreadyThere.has(e.studentId)) {
      skipped.push({
        rollNumber: e.rollNumber,
        reason: "Already enrolled in the destination session",
      });
      return false;
    }
    return true;
  });

  if (toPromote.length === 0) {
    return { promoted: 0, skipped };
  }

  await db.transaction(async (tx) => {
    await tx.insert(enrollments).values(
      toPromote.map((e) => ({
        studentId: e.studentId,
        academicSessionId: to!.academicSessionId,
        sectionId: to!.id,
        yearLevel: to!.yearLevel,
        status: "ACTIVE" as const,
      })),
    );

    await tx
      .update(enrollments)
      .set({ status: "PROMOTED" })
      .where(
        inArray(
          enrollments.id,
          toPromote.map((e) => e.id),
        ),
      );

    for (const e of toPromote) {
      await audit(tx, {
        actorId,
        action: "PROMOTE",
        entityType: "student",
        entityId: e.studentId,
        before: { sectionId: from!.id, yearLevel: from!.yearLevel },
        after: { sectionId: to!.id, yearLevel: to!.yearLevel },
        departmentId: from!.departmentId,
      });
    }
  });

  return { promoted: toPromote.length, skipped };
}

/** Marks 4th-year enrollments COMPLETED (graduation). */
export async function graduateStudents(
  actorId: string,
  input: { sectionId: string; studentIds: string[] },
): Promise<number> {
  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));
  if (!section) actionError("Section not found.");
  if (section!.yearLevel !== "YEAR_4") {
    actionError("Only 4th-year sections can be marked as completed.");
  }

  const rows = await db
    .select({ id: enrollments.id, studentId: enrollments.studentId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.sectionId, input.sectionId),
        eq(enrollments.status, "ACTIVE"),
        inArray(enrollments.studentId, input.studentIds),
      ),
    );
  if (rows.length === 0) return 0;

  await db.transaction(async (tx) => {
    await tx
      .update(enrollments)
      .set({ status: "COMPLETED" })
      .where(
        inArray(
          enrollments.id,
          rows.map((r) => r.id),
        ),
      );
    for (const r of rows) {
      await audit(tx, {
        actorId,
        action: "PROMOTE",
        entityType: "student",
        entityId: r.studentId,
        before: { sectionId: section!.id, status: "ACTIVE" },
        after: { status: "COMPLETED" },
        departmentId: section!.departmentId,
      });
    }
  });

  return rows.length;
}

/** Every section with its session — promotion needs cross-session options. */
export async function listSectionsAcrossSessions(departmentIds?: string[]) {
  const { academicSessions, departments } = await import("@/db/schema");
  return db
    .select({
      id: sections.id,
      name: sections.name,
      yearLevel: sections.yearLevel,
      departmentId: sections.departmentId,
      departmentName: departments.name,
      academicSessionId: sections.academicSessionId,
      sessionLabel: academicSessions.label,
      sessionIsActive: academicSessions.isActive,
      isActive: sections.isActive,
    })
    .from(sections)
    .innerJoin(departments, eq(sections.departmentId, departments.id))
    .innerJoin(
      academicSessions,
      eq(sections.academicSessionId, academicSessions.id),
    )
    .where(
      departmentIds ? inArray(sections.departmentId, departmentIds) : undefined,
    )
    .orderBy(academicSessions.label, departments.name, sections.yearLevel, sections.name);
}

/** Full enrollment history for one student, newest first. */
export async function getEnrollmentHistory(studentId: string) {
  const { academicSessions } = await import("@/db/schema");
  return db
    .select({
      id: enrollments.id,
      sessionLabel: academicSessions.label,
      sectionName: sections.name,
      yearLevel: enrollments.yearLevel,
      status: enrollments.status,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(sections, eq(enrollments.sectionId, sections.id))
    .innerJoin(
      academicSessions,
      eq(enrollments.academicSessionId, academicSessions.id),
    )
    .where(eq(enrollments.studentId, studentId))
    .orderBy(academicSessions.label);
}
