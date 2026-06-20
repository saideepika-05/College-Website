"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  assertDepartmentInScope,
  assertTeacherPair,
  AuthorizationError,
} from "@/lib/authz";
import {
  actionError,
  adminAction,
  hodAction,
  teacherAction,
} from "@/lib/safe-action";
import { departmentOfSection } from "@/modules/teaching/service";
import {
  assignedTeacherFor,
  closeSession,
  editRecord,
  getSessionRow,
  openSession,
  sessionMatchesPairs,
} from "./service";

const openSchema = z.object({
  sectionId: z.string().min(1, "Select a section"),
  subjectId: z.string().min(1, "Select a subject"),
});

const sessionIdSchema = z.object({ sessionId: z.string().min(1) });

const editRecordSchema = z.object({
  recordId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT"]),
});

function revalidateAttendance() {
  revalidatePath("/teacher/attendance");
  revalidatePath("/hod/attendance");
  revalidatePath("/admin/attendance");
  revalidatePath("/student/attendance");
  revalidatePath("/student");
}

// ---------------------------------------------------------------------------
// Open
// ---------------------------------------------------------------------------

export const teacherOpenAttendanceSession = teacherAction
  .metadata({ actionName: "attendance.open" })
  .inputSchema(openSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertTeacherPair(ctx.scope, parsedInput.subjectId, parsedInput.sectionId);
    const session = await openSession(ctx.user.id, {
      teacherId: ctx.scope.teacherId,
      sectionId: parsedInput.sectionId,
      subjectId: parsedInput.subjectId,
    });
    revalidateAttendance();
    return { sessionId: session.id };
  });

export const hodOpenAttendanceSession = hodAction
  .metadata({ actionName: "attendance.open.hod" })
  .inputSchema(openSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfSection(parsedInput.sectionId);
    if (!dept) actionError("Section not found.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    const teacherId = await assignedTeacherFor(
      parsedInput.sectionId,
      parsedInput.subjectId,
    );
    if (!teacherId) {
      actionError(
        "No (single) teacher is assigned to this subject for this section.",
      );
    }
    const session = await openSession(ctx.user.id, {
      teacherId: teacherId!,
      sectionId: parsedInput.sectionId,
      subjectId: parsedInput.subjectId,
    });
    revalidateAttendance();
    return { sessionId: session.id };
  });

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

export const teacherCloseAttendanceSession = teacherAction
  .metadata({ actionName: "attendance.close" })
  .inputSchema(sessionIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await getSessionRow(parsedInput.sessionId);
    if (!session) actionError("Session not found.");
    if (
      session!.teacherId !== ctx.scope.teacherId &&
      !sessionMatchesPairs(session!, ctx.scope.pairs)
    ) {
      throw new AuthorizationError("This is not your attendance session.");
    }
    await closeSession(ctx.user.id, parsedInput.sessionId);
    revalidateAttendance();
  });

export const hodCloseAttendanceSession = hodAction
  .metadata({ actionName: "attendance.close.hod" })
  .inputSchema(sessionIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await getSessionRow(parsedInput.sessionId);
    if (!session) actionError("Session not found.");
    const dept = await departmentOfSection(session!.sectionId);
    assertDepartmentInScope(ctx.departmentIds, dept ?? "");
    await closeSession(ctx.user.id, parsedInput.sessionId);
    revalidateAttendance();
  });

export const adminCloseAttendanceSession = adminAction
  .metadata({ actionName: "attendance.close.admin" })
  .inputSchema(sessionIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    await closeSession(ctx.user.id, parsedInput.sessionId);
    revalidateAttendance();
  });

// ---------------------------------------------------------------------------
// Edit records
// ---------------------------------------------------------------------------

export const teacherEditAttendanceRecord = teacherAction
  .metadata({ actionName: "attendance.editRecord" })
  .inputSchema(editRecordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { db } = await import("@/db");
    const { attendanceRecords } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [rec] = await db
      .select({ sessionId: attendanceRecords.attendanceSessionId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, parsedInput.recordId));
    if (!rec) actionError("Record not found.");
    const session = await getSessionRow(rec!.sessionId);
    if (
      !session ||
      (session.teacherId !== ctx.scope.teacherId &&
        !sessionMatchesPairs(session, ctx.scope.pairs))
    ) {
      throw new AuthorizationError("This record is outside your classes.");
    }
    await editRecord(ctx.user.id, parsedInput.recordId, parsedInput.status);
    revalidateAttendance();
  });

export const hodEditAttendanceRecord = hodAction
  .metadata({ actionName: "attendance.editRecord.hod" })
  .inputSchema(editRecordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { db } = await import("@/db");
    const { attendanceRecords } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [rec] = await db
      .select({ sessionId: attendanceRecords.attendanceSessionId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, parsedInput.recordId));
    if (!rec) actionError("Record not found.");
    const session = await getSessionRow(rec!.sessionId);
    if (!session) actionError("Session not found.");
    const dept = await departmentOfSection(session!.sectionId);
    assertDepartmentInScope(ctx.departmentIds, dept ?? "");
    await editRecord(ctx.user.id, parsedInput.recordId, parsedInput.status);
    revalidateAttendance();
  });

export const adminEditAttendanceRecord = adminAction
  .metadata({ actionName: "attendance.editRecord.admin" })
  .inputSchema(editRecordSchema)
  .action(async ({ parsedInput, ctx }) => {
    await editRecord(ctx.user.id, parsedInput.recordId, parsedInput.status);
    revalidateAttendance();
  });
