import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  assignmentTargets,
  notices,
  noticeTargets,
  sections,
  subjects,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { getActiveAcademicSession } from "@/lib/authz";
import { actionError } from "@/lib/safe-action";

/**
 * Coursework domain services shared by the portal actions. Callers are
 * responsible for SCOPE checks (HOD department / teacher pair / ownership);
 * services enforce INTEGRITY (subject/section/session coherence).
 */

export async function createAssignmentWithTargets(
  actorId: string,
  input: {
    title: string;
    description: string;
    subjectId: string;
    dueDate: string;
    sectionIds: string[];
  },
) {
  const active = await getActiveAcademicSession();
  if (!active) {
    actionError("No active academic session. Activate one first.");
  }

  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, input.subjectId));
  if (!subject || !subject.isActive) actionError("Subject not found.");

  const sectionIds = [...new Set(input.sectionIds)];
  const sectionRows = await db
    .select()
    .from(sections)
    .where(inArray(sections.id, sectionIds));

  if (sectionRows.length !== sectionIds.length) {
    actionError("One or more selected sections were not found.");
  }
  for (const section of sectionRows) {
    if (!section.isActive) {
      actionError(`Section ${section.name} is inactive.`);
    }
    if (section.academicSessionId !== active!.id) {
      actionError(
        `Section ${section.name} is not part of the active academic session.`,
      );
    }
    if (section.departmentId !== subject!.departmentId) {
      actionError(
        `Section ${section.name} does not belong to the subject's department.`,
      );
    }
    if (section.yearLevel !== subject!.yearLevel) {
      actionError(
        `Section ${section.name} is not in the same year as the subject.`,
      );
    }
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(assignments)
      .values({
        title: input.title,
        description: input.description,
        subjectId: input.subjectId,
        academicSessionId: active!.id,
        assignedDate: new Date().toISOString().slice(0, 10),
        dueDate: input.dueDate,
        createdById: actorId,
      })
      .returning();

    await tx.insert(assignmentTargets).values(
      sectionIds.map((sectionId) => ({
        assignmentId: row!.id,
        sectionId,
      })),
    );

    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "assignment",
      entityId: row!.id,
      after: { ...row, sectionIds },
      departmentId: subject!.departmentId,
    });

    return row!;
  });
}

export async function updateAssignment(
  actorId: string,
  input: { id: string; title: string; description: string; dueDate: string },
) {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        assignment: assignments,
        departmentId: subjects.departmentId,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .where(eq(assignments.id, input.id));
    if (!existing) actionError("Assignment not found.");

    const [after] = await tx
      .update(assignments)
      .set({
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
      })
      .where(eq(assignments.id, input.id))
      .returning();

    await audit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "assignment",
      entityId: input.id,
      before: existing!.assignment,
      after,
      departmentId: existing!.departmentId,
    });
  });
}

export async function deleteAssignment(actorId: string, id: string) {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        assignment: assignments,
        departmentId: subjects.departmentId,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .where(eq(assignments.id, id));
    if (!existing) actionError("Assignment not found.");

    // Targets cascade on delete.
    await tx.delete(assignments).where(eq(assignments.id, id));

    await audit(tx, {
      actorId,
      action: "DELETE",
      entityType: "assignment",
      entityId: id,
      before: existing!.assignment,
      departmentId: existing!.departmentId,
    });
  });
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export async function createNotice(
  actorId: string,
  input: {
    title: string;
    body: string;
    type: "INSTITUTION" | "DEPARTMENT" | "SECTION";
    /** Stored on the row for DEPARTMENT notices; used for audit otherwise. */
    departmentId?: string | null;
    sectionIds?: string[];
  },
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(notices)
      .values({
        title: input.title,
        body: input.body,
        type: input.type,
        departmentId:
          input.type === "DEPARTMENT" ? (input.departmentId ?? null) : null,
        createdById: actorId,
      })
      .returning();

    const sectionIds = [...new Set(input.sectionIds ?? [])];
    if (input.type === "SECTION" && sectionIds.length > 0) {
      await tx.insert(noticeTargets).values(
        sectionIds.map((sectionId) => ({
          noticeId: row!.id,
          sectionId,
        })),
      );
    }

    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "notice",
      entityId: row!.id,
      after: { ...row, sectionIds },
      departmentId: input.departmentId ?? null,
    });

    return row!;
  });
}

export async function deactivateNotice(actorId: string, id: string) {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(notices).where(eq(notices.id, id));
    if (!before) actionError("Notice not found.");

    const [after] = await tx
      .update(notices)
      .set({ isActive: false })
      .where(eq(notices.id, id))
      .returning();

    await audit(tx, {
      actorId,
      action: "DEACTIVATE",
      entityType: "notice",
      entityId: id,
      before,
      after,
      departmentId: before!.departmentId,
    });
  });
}
