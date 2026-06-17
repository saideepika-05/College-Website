import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  academicSessions,
  enrollments,
  hodAssignments,
  students,
  teacherAssignments,
  teachers,
} from "@/db/schema";

/**
 * Scope resolvers — the single source of truth for "what is this user
 * allowed to see/touch". Every server action and every server-component
 * query funnels through these. Per-request cached.
 */

export const getActiveAcademicSession = cache(async () => {
  const [active] = await db
    .select()
    .from(academicSessions)
    .where(eq(academicSessions.isActive, true))
    .limit(1);
  return active ?? null;
});

/** Departments this HOD user manages. Empty array = no access. */
export const getHodDepartmentIds = cache(
  async (userId: string): Promise<string[]> => {
    const rows = await db
      .select({ departmentId: hodAssignments.departmentId })
      .from(hodAssignments)
      .where(eq(hodAssignments.userId, userId));
    return rows.map((r) => r.departmentId);
  },
);

export type TeacherScope = {
  teacherId: string;
  departmentId: string;
  /** (subjectId, sectionId) pairs in the active academic session. */
  pairs: { subjectId: string; sectionId: string }[];
  sectionIds: string[];
  subjectIds: string[];
};

/** A teacher's reach: their profile + assigned (subject, section) pairs. */
export const getTeacherScope = cache(
  async (userId: string): Promise<TeacherScope | null> => {
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, userId))
      .limit(1);
    if (!teacher) return null;

    const active = await getActiveAcademicSession();
    const pairs = active
      ? await db
          .select({
            subjectId: teacherAssignments.subjectId,
            sectionId: teacherAssignments.sectionId,
          })
          .from(teacherAssignments)
          .where(
            and(
              eq(teacherAssignments.teacherId, teacher.id),
              eq(teacherAssignments.academicSessionId, active.id),
            ),
          )
      : [];

    return {
      teacherId: teacher.id,
      departmentId: teacher.departmentId,
      pairs,
      sectionIds: [...new Set(pairs.map((p) => p.sectionId))],
      subjectIds: [...new Set(pairs.map((p) => p.subjectId))],
    };
  },
);

export type StudentScope = {
  studentId: string;
  departmentId: string;
  rollNumber: string;
  /** Enrollment in the active academic session, if any. */
  currentEnrollment: {
    id: string;
    sectionId: string;
    yearLevel: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4";
    academicSessionId: string;
  } | null;
};

/** A student's reach: themselves and their active-session enrollment. */
export const getStudentScope = cache(
  async (userId: string): Promise<StudentScope | null> => {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);
    if (!student) return null;

    const active = await getActiveAcademicSession();
    let currentEnrollment: StudentScope["currentEnrollment"] = null;
    if (active) {
      const [enr] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, student.id),
            eq(enrollments.academicSessionId, active.id),
            eq(enrollments.status, "ACTIVE"),
          ),
        )
        .limit(1);
      if (enr) {
        currentEnrollment = {
          id: enr.id,
          sectionId: enr.sectionId,
          yearLevel: enr.yearLevel,
          academicSessionId: enr.academicSessionId,
        };
      }
    }

    return {
      studentId: student.id,
      departmentId: student.departmentId,
      rollNumber: student.rollNumber,
      currentEnrollment,
    };
  },
);

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throws unless the department is inside the HOD's scope. */
export function assertDepartmentInScope(
  departmentIds: string[],
  departmentId: string,
): void {
  if (!departmentIds.includes(departmentId)) {
    throw new AuthorizationError(
      "This record belongs to a department outside your scope.",
    );
  }
}

/** Throws unless the teacher is assigned to this (subject, section) pair. */
export function assertTeacherPair(
  scope: TeacherScope,
  subjectId: string,
  sectionId: string,
): void {
  const ok = scope.pairs.some(
    (p) => p.subjectId === subjectId && p.sectionId === sectionId,
  );
  if (!ok) {
    throw new AuthorizationError(
      "You are not assigned to this subject for this section.",
    );
  }
}
