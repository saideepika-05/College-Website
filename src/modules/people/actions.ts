"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { hodAssignments, students, teachers, user } from "@/db/schema";
import { assertDepartmentInScope } from "@/lib/authz";
import { actionError, adminAction, hodAction } from "@/lib/safe-action";
import {
  hodCreateSchema,
  resetPasswordSchema,
  setUserActiveSchema,
  studentCreateSchema,
  studentUpdateSchema,
  teacherCreateSchema,
  teacherUpdateSchema,
  transferStudentSchema,
} from "./schemas";
import {
  createHodProfile,
  createStudentWithEnrollment,
  createTeacherProfile,
  resetAccountPassword,
  setAccountActive,
  transferStudent,
  updateStudentProfile,
  updateTeacherProfile,
} from "./service";

function revalidatePeople() {
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/hods");
  revalidatePath("/hod/students");
  revalidatePath("/hod/teachers");
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export const adminCreateStudent = adminAction
  .metadata({ actionName: "student.create" })
  .inputSchema(studentCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const s = await createStudentWithEnrollment(ctx.user.id, parsedInput);
    revalidatePeople();
    return { id: s.id };
  });

export const hodCreateStudent = hodAction
  .metadata({ actionName: "student.create.hod" })
  .inputSchema(studentCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertDepartmentInScope(ctx.departmentIds, parsedInput.departmentId);
    const s = await createStudentWithEnrollment(ctx.user.id, parsedInput);
    revalidatePeople();
    return { id: s.id };
  });

export const adminUpdateStudent = adminAction
  .metadata({ actionName: "student.update" })
  .inputSchema(studentUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    await updateStudentProfile(ctx.user.id, parsedInput);
    revalidatePeople();
  });

export const hodUpdateStudent = hodAction
  .metadata({ actionName: "student.update.hod" })
  .inputSchema(studentUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [target] = await db
      .select({ departmentId: students.departmentId })
      .from(students)
      .where(eq(students.id, parsedInput.id));
    if (!target) actionError("Student not found.");
    assertDepartmentInScope(ctx.departmentIds, target!.departmentId);
    await updateStudentProfile(ctx.user.id, parsedInput);
    revalidatePeople();
  });

export const adminTransferStudent = adminAction
  .metadata({ actionName: "student.transfer" })
  .inputSchema(transferStudentSchema)
  .action(async ({ parsedInput, ctx }) => {
    await transferStudent(
      ctx.user.id,
      parsedInput.studentId,
      parsedInput.newSectionId,
    );
    revalidatePeople();
  });

export const hodTransferStudent = hodAction
  .metadata({ actionName: "student.transfer.hod" })
  .inputSchema(transferStudentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [target] = await db
      .select({ departmentId: students.departmentId })
      .from(students)
      .where(eq(students.id, parsedInput.studentId));
    if (!target) actionError("Student not found.");
    assertDepartmentInScope(ctx.departmentIds, target!.departmentId);
    await transferStudent(
      ctx.user.id,
      parsedInput.studentId,
      parsedInput.newSectionId,
    );
    revalidatePeople();
  });

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

export const adminCreateTeacher = adminAction
  .metadata({ actionName: "teacher.create" })
  .inputSchema(teacherCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const t = await createTeacherProfile(ctx.user.id, parsedInput);
    revalidatePeople();
    return { id: t.id };
  });

export const hodCreateTeacher = hodAction
  .metadata({ actionName: "teacher.create.hod" })
  .inputSchema(teacherCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertDepartmentInScope(ctx.departmentIds, parsedInput.departmentId);
    const t = await createTeacherProfile(ctx.user.id, parsedInput);
    revalidatePeople();
    return { id: t.id };
  });

export const adminUpdateTeacher = adminAction
  .metadata({ actionName: "teacher.update" })
  .inputSchema(teacherUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    await updateTeacherProfile(ctx.user.id, parsedInput);
    revalidatePeople();
  });

export const hodUpdateTeacher = hodAction
  .metadata({ actionName: "teacher.update.hod" })
  .inputSchema(teacherUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [target] = await db
      .select({ departmentId: teachers.departmentId })
      .from(teachers)
      .where(eq(teachers.id, parsedInput.id));
    if (!target) actionError("Teacher not found.");
    assertDepartmentInScope(ctx.departmentIds, target!.departmentId);
    await updateTeacherProfile(ctx.user.id, parsedInput);
    revalidatePeople();
  });

// ---------------------------------------------------------------------------
// HODs (admin only)
// ---------------------------------------------------------------------------

export const adminCreateHod = adminAction
  .metadata({ actionName: "hod.create" })
  .inputSchema(hodCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const h = await createHodProfile(ctx.user.id, parsedInput);
    revalidatePeople();
    return { id: h.id };
  });

export const adminRemoveHod = adminAction
  .metadata({ actionName: "hod.remove" })
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const [assignment] = await db
      .select()
      .from(hodAssignments)
      .where(eq(hodAssignments.id, parsedInput.id));
    if (!assignment) actionError("HOD assignment not found.");
    await db.transaction(async (tx) => {
      await tx
        .delete(hodAssignments)
        .where(eq(hodAssignments.id, parsedInput.id));
      // The login stays but loses portal access; deactivate it too.
      await tx
        .update(user)
        .set({ isActive: false })
        .where(eq(user.id, assignment!.userId));
      const { audit } = await import("@/lib/audit");
      await audit(tx, {
        actorId: ctx.user.id,
        action: "DELETE",
        entityType: "hod",
        entityId: parsedInput.id,
        before: assignment,
        departmentId: assignment!.departmentId,
      });
    });
    revalidatePeople();
  });

// ---------------------------------------------------------------------------
// Account status + password resets
// ---------------------------------------------------------------------------

/** Looks up which department a user belongs to (for scope checks/audit). */
async function departmentOfUser(userId: string): Promise<string | null> {
  const [s] = await db
    .select({ d: students.departmentId })
    .from(students)
    .where(eq(students.userId, userId));
  if (s) return s.d;
  const [t] = await db
    .select({ d: teachers.departmentId })
    .from(teachers)
    .where(eq(teachers.userId, userId));
  if (t) return t.d;
  const [h] = await db
    .select({ d: hodAssignments.departmentId })
    .from(hodAssignments)
    .where(eq(hodAssignments.userId, userId));
  return h?.d ?? null;
}

export const adminSetUserActive = adminAction
  .metadata({ actionName: "user.setActive" })
  .inputSchema(setUserActiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.userId === ctx.user.id) {
      actionError("You cannot deactivate your own account.");
    }
    const dept = await departmentOfUser(parsedInput.userId);
    await setAccountActive(
      ctx.user.id,
      parsedInput.userId,
      parsedInput.isActive,
      dept,
    );
    revalidatePeople();
  });

export const hodSetUserActive = hodAction
  .metadata({ actionName: "user.setActive.hod" })
  .inputSchema(setUserActiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfUser(parsedInput.userId);
    if (!dept) actionError("User not found in any department.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    // HODs manage students and teachers only — never other HODs/admins.
    const [target] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, parsedInput.userId));
    if (!target || (target.role !== "STUDENT" && target.role !== "TEACHER")) {
      actionError("You can only manage students and teachers.");
    }
    await setAccountActive(
      ctx.user.id,
      parsedInput.userId,
      parsedInput.isActive,
      dept!,
    );
    revalidatePeople();
  });

export const adminResetPassword = adminAction
  .metadata({ actionName: "user.resetPassword" })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfUser(parsedInput.userId);
    await resetAccountPassword(
      ctx.user.id,
      parsedInput.userId,
      parsedInput.newPassword,
      dept,
    );
  });

export const hodResetPassword = hodAction
  .metadata({ actionName: "user.resetPassword.hod" })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfUser(parsedInput.userId);
    if (!dept) actionError("User not found in any department.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    const [target] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, parsedInput.userId));
    if (!target || (target.role !== "STUDENT" && target.role !== "TEACHER")) {
      actionError("You can only manage students and teachers.");
    }
    await resetAccountPassword(
      ctx.user.id,
      parsedInput.userId,
      parsedInput.newPassword,
      dept!,
    );
  });
