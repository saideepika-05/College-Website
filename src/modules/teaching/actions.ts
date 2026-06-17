"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { assertDepartmentInScope } from "@/lib/authz";
import { actionError, adminAction, hodAction } from "@/lib/safe-action";
import {
  deleteTeacherAssignmentSchema,
  deleteTimetableEntrySchema,
  teacherAssignmentSchema,
  timetableEntrySchema,
} from "./schemas";
import {
  addTimetableEntry,
  createAssignment,
  departmentOfSection,
  removeAssignment,
  removeTimetableEntry,
} from "./service";

function revalidateTeaching() {
  revalidatePath("/admin/teacher-assignments");
  revalidatePath("/hod/teacher-assignments");
  revalidatePath("/admin/timetables");
  revalidatePath("/hod/timetables");
  revalidatePath("/teacher/timetable");
  revalidatePath("/student/timetable");
}

// ---------------------------------------------------------------------------
// Teacher subject assignments
// ---------------------------------------------------------------------------

export const adminCreateTeacherAssignment = adminAction
  .metadata({ actionName: "teacherAssignment.create" })
  .inputSchema(teacherAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    await createAssignment(ctx.user.id, parsedInput);
    revalidateTeaching();
  });

export const hodCreateTeacherAssignment = hodAction
  .metadata({ actionName: "teacherAssignment.create.hod" })
  .inputSchema(teacherAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [teacher] = await db
      .select({ departmentId: teachers.departmentId })
      .from(teachers)
      .where(eq(teachers.id, parsedInput.teacherId));
    if (!teacher) actionError("Teacher not found.");
    assertDepartmentInScope(ctx.departmentIds, teacher!.departmentId);
    await createAssignment(ctx.user.id, parsedInput);
    revalidateTeaching();
  });

export const adminRemoveTeacherAssignment = adminAction
  .metadata({ actionName: "teacherAssignment.delete" })
  .inputSchema(deleteTeacherAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    await removeAssignment(ctx.user.id, parsedInput.id);
    revalidateTeaching();
  });

export const hodRemoveTeacherAssignment = hodAction
  .metadata({ actionName: "teacherAssignment.delete.hod" })
  .inputSchema(deleteTeacherAssignmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { teacherAssignments } = await import("@/db/schema");
    const [target] = await db
      .select({ departmentId: teachers.departmentId })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .where(eq(teacherAssignments.id, parsedInput.id));
    if (!target) actionError("Assignment not found.");
    assertDepartmentInScope(ctx.departmentIds, target!.departmentId);
    await removeAssignment(ctx.user.id, parsedInput.id);
    revalidateTeaching();
  });

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

export const adminAddTimetableEntry = adminAction
  .metadata({ actionName: "timetable.add" })
  .inputSchema(timetableEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    await addTimetableEntry(ctx.user.id, parsedInput);
    revalidateTeaching();
  });

export const hodAddTimetableEntry = hodAction
  .metadata({ actionName: "timetable.add.hod" })
  .inputSchema(timetableEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfSection(parsedInput.sectionId);
    if (!dept) actionError("Section not found.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    await addTimetableEntry(ctx.user.id, parsedInput);
    revalidateTeaching();
  });

export const adminRemoveTimetableEntry = adminAction
  .metadata({ actionName: "timetable.remove" })
  .inputSchema(deleteTimetableEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    await removeTimetableEntry(ctx.user.id, parsedInput.id);
    revalidateTeaching();
  });

export const hodRemoveTimetableEntry = hodAction
  .metadata({ actionName: "timetable.remove.hod" })
  .inputSchema(deleteTimetableEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    // Scope check happens inside: load entry's section department first.
    const { timetableEntries, sections } = await import("@/db/schema");
    const [row] = await db
      .select({ departmentId: sections.departmentId })
      .from(timetableEntries)
      .innerJoin(sections, eq(timetableEntries.sectionId, sections.id))
      .where(eq(timetableEntries.id, parsedInput.id));
    if (!row) actionError("Timetable entry not found.");
    assertDepartmentInScope(ctx.departmentIds, row!.departmentId);
    await removeTimetableEntry(ctx.user.id, parsedInput.id);
    revalidateTeaching();
  });
