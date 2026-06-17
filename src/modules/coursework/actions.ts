"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assignments, notices, subjects } from "@/db/schema";
import { assertDepartmentInScope, assertTeacherPair } from "@/lib/authz";
import {
  actionError,
  adminAction,
  hodAction,
  teacherAction,
} from "@/lib/safe-action";
import {
  assignmentCreateSchema,
  assignmentDeleteSchema,
  assignmentUpdateSchema,
  noticeCreateSchema,
  noticeDeleteSchema,
} from "./schemas";
import {
  createAssignmentWithTargets,
  createNotice,
  deactivateNotice,
  deleteAssignment,
  updateAssignment,
} from "./service";

function revalidateAssignments() {
  revalidatePath("/admin/assignments");
  revalidatePath("/hod/assignments");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/assignments");
}

function revalidateNotices() {
  revalidatePath("/admin/notices");
  revalidatePath("/hod/notices");
  revalidatePath("/teacher/notices");
  revalidatePath("/student");
  revalidatePath("/student/notices");
}

/** Department of the assignment's subject, for HOD scope checks. */
async function assignmentDepartment(assignmentId: string) {
  const [row] = await db
    .select({ departmentId: subjects.departmentId })
    .from(assignments)
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(eq(assignments.id, assignmentId));
  if (!row) actionError("Assignment not found.");
  return row!.departmentId;
}

/** Creator of the assignment, for teacher ownership checks. */
async function assignmentCreator(assignmentId: string) {
  const [row] = await db
    .select({ createdById: assignments.createdById })
    .from(assignments)
    .where(eq(assignments.id, assignmentId));
  if (!row) actionError("Assignment not found.");
  return row!.createdById;
}

// ---------------------------------------------------------------------------
// Assignments — create
// ---------------------------------------------------------------------------

export const adminCreateAssignment = adminAction
  .metadata({ actionName: "assignment.create" })
  .inputSchema(assignmentCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const row = await createAssignmentWithTargets(ctx.user.id, parsedInput);
    revalidateAssignments();
    return { id: row.id };
  });

export const hodCreateAssignment = hodAction
  .metadata({ actionName: "assignment.create.hod" })
  .inputSchema(assignmentCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [subject] = await db
      .select({ departmentId: subjects.departmentId })
      .from(subjects)
      .where(eq(subjects.id, parsedInput.subjectId));
    if (!subject) actionError("Subject not found.");
    assertDepartmentInScope(ctx.departmentIds, subject!.departmentId);
    const row = await createAssignmentWithTargets(ctx.user.id, parsedInput);
    revalidateAssignments();
    return { id: row.id };
  });

export const teacherCreateAssignment = teacherAction
  .metadata({ actionName: "assignment.create.teacher" })
  .inputSchema(assignmentCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    for (const sectionId of parsedInput.sectionIds) {
      assertTeacherPair(ctx.scope, parsedInput.subjectId, sectionId);
    }
    const row = await createAssignmentWithTargets(ctx.user.id, parsedInput);
    revalidateAssignments();
    return { id: row.id };
  });

// ---------------------------------------------------------------------------
// Assignments — update
// ---------------------------------------------------------------------------

export const adminUpdateAssignment = adminAction
  .metadata({ actionName: "assignment.update" })
  .inputSchema(assignmentUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    await updateAssignment(ctx.user.id, parsedInput);
    revalidateAssignments();
  });

export const hodUpdateAssignment = hodAction
  .metadata({ actionName: "assignment.update.hod" })
  .inputSchema(assignmentUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const departmentId = await assignmentDepartment(parsedInput.id);
    assertDepartmentInScope(ctx.departmentIds, departmentId);
    await updateAssignment(ctx.user.id, parsedInput);
    revalidateAssignments();
  });

export const teacherUpdateAssignment = teacherAction
  .metadata({ actionName: "assignment.update.teacher" })
  .inputSchema(assignmentUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const createdById = await assignmentCreator(parsedInput.id);
    if (createdById !== ctx.user.id) {
      actionError("You can only modify your own assignments.");
    }
    await updateAssignment(ctx.user.id, parsedInput);
    revalidateAssignments();
  });

// ---------------------------------------------------------------------------
// Assignments — delete
// ---------------------------------------------------------------------------

export const adminDeleteAssignment = adminAction
  .metadata({ actionName: "assignment.delete" })
  .inputSchema(assignmentDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    await deleteAssignment(ctx.user.id, parsedInput.id);
    revalidateAssignments();
  });

export const hodDeleteAssignment = hodAction
  .metadata({ actionName: "assignment.delete.hod" })
  .inputSchema(assignmentDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const departmentId = await assignmentDepartment(parsedInput.id);
    assertDepartmentInScope(ctx.departmentIds, departmentId);
    await deleteAssignment(ctx.user.id, parsedInput.id);
    revalidateAssignments();
  });

export const teacherDeleteAssignment = teacherAction
  .metadata({ actionName: "assignment.delete.teacher" })
  .inputSchema(assignmentDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const createdById = await assignmentCreator(parsedInput.id);
    if (createdById !== ctx.user.id) {
      actionError("You can only modify your own assignments.");
    }
    await deleteAssignment(ctx.user.id, parsedInput.id);
    revalidateAssignments();
  });

// ---------------------------------------------------------------------------
// Notices — create
// ---------------------------------------------------------------------------

export const adminCreateNotice = adminAction
  .metadata({ actionName: "notice.create" })
  .inputSchema(noticeCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const row = await createNotice(ctx.user.id, {
      title: parsedInput.title,
      body: parsedInput.body,
      type: "INSTITUTION",
    });
    revalidateNotices();
    return { id: row.id };
  });

export const hodCreateNotice = hodAction
  .metadata({ actionName: "notice.create.hod" })
  .inputSchema(noticeCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const departmentId = parsedInput.departmentId ?? ctx.departmentIds[0]!;
    assertDepartmentInScope(ctx.departmentIds, departmentId);
    const row = await createNotice(ctx.user.id, {
      title: parsedInput.title,
      body: parsedInput.body,
      type: "DEPARTMENT",
      departmentId,
    });
    revalidateNotices();
    return { id: row.id };
  });

export const teacherCreateNotice = teacherAction
  .metadata({ actionName: "notice.create.teacher" })
  .inputSchema(noticeCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const sectionIds = parsedInput.sectionIds ?? [];
    if (sectionIds.length === 0) {
      actionError("Pick at least one section.");
    }
    for (const sectionId of sectionIds) {
      if (!ctx.scope.sectionIds.includes(sectionId)) {
        actionError("You are not assigned to one of the selected sections.");
      }
    }
    const row = await createNotice(ctx.user.id, {
      title: parsedInput.title,
      body: parsedInput.body,
      type: "SECTION",
      departmentId: ctx.scope.departmentId,
      sectionIds,
    });
    revalidateNotices();
    return { id: row.id };
  });

// ---------------------------------------------------------------------------
// Notices — deactivate
// ---------------------------------------------------------------------------

export const adminDeactivateNotice = adminAction
  .metadata({ actionName: "notice.deactivate" })
  .inputSchema(noticeDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    await deactivateNotice(ctx.user.id, parsedInput.id);
    revalidateNotices();
  });

export const hodDeactivateNotice = hodAction
  .metadata({ actionName: "notice.deactivate.hod" })
  .inputSchema(noticeDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [notice] = await db
      .select({
        createdById: notices.createdById,
        type: notices.type,
        departmentId: notices.departmentId,
      })
      .from(notices)
      .where(eq(notices.id, parsedInput.id));
    if (!notice) actionError("Notice not found.");
    const ownsIt = notice!.createdById === ctx.user.id;
    const isOwnDepartment =
      notice!.type === "DEPARTMENT" &&
      notice!.departmentId !== null &&
      ctx.departmentIds.includes(notice!.departmentId);
    if (!ownsIt && !isOwnDepartment) {
      actionError(
        "You can only deactivate your own notices or your department's notices.",
      );
    }
    await deactivateNotice(ctx.user.id, parsedInput.id);
    revalidateNotices();
  });

export const teacherDeactivateNotice = teacherAction
  .metadata({ actionName: "notice.deactivate.teacher" })
  .inputSchema(noticeDeleteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [notice] = await db
      .select({ createdById: notices.createdById })
      .from(notices)
      .where(eq(notices.id, parsedInput.id));
    if (!notice) actionError("Notice not found.");
    if (notice!.createdById !== ctx.user.id) {
      actionError("You can only deactivate your own notices.");
    }
    await deactivateNotice(ctx.user.id, parsedInput.id);
    revalidateNotices();
  });
