import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  sections,
  subjects,
  teacherAssignments,
  teachers,
  timetableEntries,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { getActiveAcademicSession } from "@/lib/authz";
import { violatedConstraint } from "@/lib/db-errors";
import { actionError } from "@/lib/safe-action";

export async function createAssignment(
  actorId: string,
  input: { teacherId: string; subjectId: string; sectionId: string },
) {
  const active = await getActiveAcademicSession();
  if (!active) actionError("No active academic session.");

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.id, input.teacherId));
  if (!teacher) actionError("Teacher not found.");

  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, input.subjectId));
  if (!subject || !subject.isActive) actionError("Subject not found.");

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));
  if (!section || !section.isActive) actionError("Section not found.");

  if (section!.academicSessionId !== active!.id) {
    actionError("The section is not part of the active academic session.");
  }
  if (subject!.departmentId !== section!.departmentId) {
    actionError("Subject and section belong to different departments.");
  }
  if (subject!.yearLevel !== section!.yearLevel) {
    actionError("Subject and section are for different academic years.");
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(teacherAssignments)
      .values({
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        academicSessionId: active!.id,
      })
      .returning();
    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "teacherAssignment",
      entityId: row!.id,
      after: row,
      departmentId: teacher!.departmentId,
    });
    return row!;
  });
}

export async function removeAssignment(actorId: string, id: string) {
  const [existing] = await db
    .select({
      assignment: teacherAssignments,
      departmentId: teachers.departmentId,
    })
    .from(teacherAssignments)
    .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
    .where(eq(teacherAssignments.id, id));
  if (!existing) actionError("Assignment not found.");

  // Refuse to orphan timetable entries that depend on this pairing.
  const [usedInTimetable] = await db
    .select({ id: timetableEntries.id })
    .from(timetableEntries)
    .where(
      and(
        eq(timetableEntries.teacherId, existing!.assignment.teacherId),
        eq(timetableEntries.subjectId, existing!.assignment.subjectId),
        eq(timetableEntries.sectionId, existing!.assignment.sectionId),
        eq(
          timetableEntries.academicSessionId,
          existing!.assignment.academicSessionId,
        ),
      ),
    )
    .limit(1);
  if (usedInTimetable) {
    actionError(
      "This assignment is used in a timetable. Remove those periods first.",
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
    await audit(tx, {
      actorId,
      action: "DELETE",
      entityType: "teacherAssignment",
      entityId: id,
      before: existing!.assignment,
      departmentId: existing!.departmentId,
    });
  });

  return existing!;
}

export async function addTimetableEntry(
  actorId: string,
  input: {
    sectionId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek:
      | "MONDAY"
      | "TUESDAY"
      | "WEDNESDAY"
      | "THURSDAY"
      | "FRIDAY"
      | "SATURDAY";
    periodNo: number;
    startTime: string;
    endTime: string;
  },
) {
  const active = await getActiveAcademicSession();
  if (!active) actionError("No active academic session.");

  // The teacher must actually be assigned to teach this subject for this
  // section — the timetable is downstream of assignments (SRS §12).
  const [assignment] = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, input.teacherId),
        eq(teacherAssignments.subjectId, input.subjectId),
        eq(teacherAssignments.sectionId, input.sectionId),
        eq(teacherAssignments.academicSessionId, active!.id),
      ),
    );
  if (!assignment) {
    actionError(
      "This teacher is not assigned to this subject for this section. Create the subject assignment first.",
    );
  }

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(timetableEntries)
        .values({ ...input, academicSessionId: active!.id })
        .returning();
      await audit(tx, {
        actorId,
        action: "CREATE",
        entityType: "timetableEntry",
        entityId: row!.id,
        after: row,
        departmentId: section?.departmentId ?? null,
      });
      return row!;
    });
  } catch (e) {
    // Surface the two timetable uniqueness constraints as readable conflicts.
    const constraint = violatedConstraint(e);
    if (constraint.includes("timetable_teacher_slot")) {
      actionError("The teacher already has a class in this slot.");
    }
    if (constraint.includes("timetable_section_slot")) {
      actionError("This section already has a class in this slot.");
    }
    throw e;
  }
}

export async function removeTimetableEntry(actorId: string, id: string) {
  const [existing] = await db
    .select({
      entry: timetableEntries,
      departmentId: sections.departmentId,
    })
    .from(timetableEntries)
    .innerJoin(sections, eq(timetableEntries.sectionId, sections.id))
    .where(eq(timetableEntries.id, id));
  if (!existing) actionError("Timetable entry not found.");

  await db.transaction(async (tx) => {
    await tx.delete(timetableEntries).where(eq(timetableEntries.id, id));
    await audit(tx, {
      actorId,
      action: "DELETE",
      entityType: "timetableEntry",
      entityId: id,
      before: existing!.entry,
      departmentId: existing!.departmentId,
    });
  });
}

/** Department a section belongs to — used by HOD scope checks. */
export async function departmentOfSection(
  sectionId: string,
): Promise<string | null> {
  const [s] = await db
    .select({ departmentId: sections.departmentId })
    .from(sections)
    .where(eq(sections.id, sectionId));
  return s?.departmentId ?? null;
}
