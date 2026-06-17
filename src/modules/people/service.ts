import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollments,
  hodAssignments,
  sections,
  students,
  teachers,
  user,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { getActiveAcademicSession } from "@/lib/authz";
import { actionError } from "@/lib/safe-action";
import { createUserWithCredentials, setUserPassword } from "@/lib/users";

/**
 * Domain services shared by the Admin and HOD actions. Callers are
 * responsible for SCOPE checks (e.g. HOD may only pass departments they
 * own); services enforce INTEGRITY (section/department/session coherence).
 */

export async function createStudentWithEnrollment(
  actorId: string,
  input: {
    name: string;
    email: string;
    rollNumber: string;
    departmentId: string;
    sectionId: string;
    password: string;
  },
) {
  const active = await getActiveAcademicSession();
  if (!active) {
    actionError("No active academic session. Activate one first.");
  }

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));
  if (!section || !section.isActive) actionError("Section not found.");
  if (section!.departmentId !== input.departmentId) {
    actionError("The section does not belong to the selected department.");
  }
  if (section!.academicSessionId !== active!.id) {
    actionError("The section is not part of the active academic session.");
  }

  return db.transaction(async (tx) => {
    const { userId } = await createUserWithCredentials(tx, {
      name: input.name,
      email: input.email,
      password: input.password,
      role: "STUDENT",
    });

    const [student] = await tx
      .insert(students)
      .values({
        userId,
        rollNumber: input.rollNumber.toUpperCase(),
        departmentId: input.departmentId,
      })
      .returning();

    const [enrollment] = await tx
      .insert(enrollments)
      .values({
        studentId: student!.id,
        academicSessionId: active!.id,
        sectionId: section!.id,
        yearLevel: section!.yearLevel,
        status: "ACTIVE",
      })
      .returning();

    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "student",
      entityId: student!.id,
      after: { ...student, enrollment },
      departmentId: input.departmentId,
    });

    return student!;
  });
}

export async function updateStudentProfile(
  actorId: string,
  input: { id: string; name: string; email: string; rollNumber: string },
) {
  const [existing] = await db
    .select()
    .from(students)
    .where(eq(students.id, input.id));
  if (!existing) actionError("Student not found.");

  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, existing!.userId));

    await tx
      .update(user)
      .set({ name: input.name, email: input.email.toLowerCase().trim() })
      .where(eq(user.id, existing!.userId));

    const [after] = await tx
      .update(students)
      .set({ rollNumber: input.rollNumber.toUpperCase() })
      .where(eq(students.id, input.id))
      .returning();

    await audit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "student",
      entityId: input.id,
      before: { ...before, rollNumber: existing!.rollNumber },
      after: { name: input.name, email: input.email, rollNumber: after!.rollNumber },
      departmentId: existing!.departmentId,
    });
  });

  return existing!;
}

/** Moves the active-session enrollment to another section (same dept+year). */
export async function transferStudent(
  actorId: string,
  studentId: string,
  newSectionId: string,
) {
  const active = await getActiveAcademicSession();
  if (!active) actionError("No active academic session.");

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId));
  if (!student) actionError("Student not found.");

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.academicSessionId, active!.id),
      ),
    );
  if (!enrollment) {
    actionError("The student has no enrollment in the active session.");
  }

  const [target] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, newSectionId));
  if (!target || !target.isActive) actionError("Destination section not found.");
  if (target!.id === enrollment!.sectionId) {
    actionError("The student is already in that section.");
  }
  if (target!.departmentId !== student!.departmentId) {
    actionError("Transfers across departments are not allowed.");
  }
  if (target!.academicSessionId !== active!.id) {
    actionError("Destination section is not in the active session.");
  }
  if (target!.yearLevel !== enrollment!.yearLevel) {
    actionError("Destination section is a different academic year.");
  }

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(enrollments)
      .set({ sectionId: newSectionId })
      .where(eq(enrollments.id, enrollment!.id))
      .returning();
    await audit(tx, {
      actorId,
      action: "TRANSFER",
      entityType: "student",
      entityId: studentId,
      before: { sectionId: enrollment!.sectionId },
      after: { sectionId: after!.sectionId },
      departmentId: student!.departmentId,
    });
  });

  return student!;
}

export async function createTeacherProfile(
  actorId: string,
  input: {
    name: string;
    email: string;
    departmentId: string;
    password: string;
  },
) {
  return db.transaction(async (tx) => {
    const { userId } = await createUserWithCredentials(tx, {
      name: input.name,
      email: input.email,
      password: input.password,
      role: "TEACHER",
    });
    const [teacher] = await tx
      .insert(teachers)
      .values({ userId, departmentId: input.departmentId })
      .returning();
    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "teacher",
      entityId: teacher!.id,
      after: teacher,
      departmentId: input.departmentId,
    });
    return teacher!;
  });
}

export async function updateTeacherProfile(
  actorId: string,
  input: { id: string; name: string; email: string },
) {
  const [existing] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.id, input.id));
  if (!existing) actionError("Teacher not found.");

  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, existing!.userId));
    await tx
      .update(user)
      .set({ name: input.name, email: input.email.toLowerCase().trim() })
      .where(eq(user.id, existing!.userId));
    await audit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "teacher",
      entityId: input.id,
      before,
      after: { name: input.name, email: input.email },
      departmentId: existing!.departmentId,
    });
  });

  return existing!;
}

export async function createHodProfile(
  actorId: string,
  input: {
    name: string;
    email: string;
    departmentId: string;
    password: string;
  },
) {
  const [taken] = await db
    .select()
    .from(hodAssignments)
    .where(eq(hodAssignments.departmentId, input.departmentId));
  if (taken) {
    actionError("This department already has an HOD. Remove them first.");
  }

  return db.transaction(async (tx) => {
    const { userId } = await createUserWithCredentials(tx, {
      name: input.name,
      email: input.email,
      password: input.password,
      role: "HOD",
    });
    const [assignment] = await tx
      .insert(hodAssignments)
      .values({ userId, departmentId: input.departmentId })
      .returning();
    await audit(tx, {
      actorId,
      action: "CREATE",
      entityType: "hod",
      entityId: assignment!.id,
      after: assignment,
      departmentId: input.departmentId,
    });
    return assignment!;
  });
}

export async function setAccountActive(
  actorId: string,
  targetUserId: string,
  isActive: boolean,
  departmentId: string | null,
) {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ isActive: user.isActive, role: user.role })
      .from(user)
      .where(eq(user.id, targetUserId));
    if (!before) actionError("User not found.");
    await tx
      .update(user)
      .set({ isActive })
      .where(eq(user.id, targetUserId));
    await audit(tx, {
      actorId,
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entityType: "user",
      entityId: targetUserId,
      before,
      after: { isActive },
      departmentId,
    });
  });
}

export async function resetAccountPassword(
  actorId: string,
  targetUserId: string,
  newPassword: string,
  departmentId: string | null,
) {
  await db.transaction(async (tx) => {
    await setUserPassword(tx, targetUserId, newPassword);
    await audit(tx, {
      actorId,
      action: "PASSWORD_RESET",
      entityType: "user",
      entityId: targetUserId,
      departmentId,
    });
  });
}
