import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  departments,
  enrollments,
  hodAssignments,
  sections,
  students,
  teachers,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";

/**
 * People list queries. `departmentIds` narrows to a scope (HOD); omit for
 * admin-wide listings.
 */

export async function listStudents(departmentIds?: string[]) {
  const active = await getActiveAcademicSession();

  const rows = await db
    .select({
      id: students.id,
      userId: students.userId,
      rollNumber: students.rollNumber,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      departmentId: students.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
    })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .where(
      departmentIds ? inArray(students.departmentId, departmentIds) : undefined,
    )
    .orderBy(asc(students.rollNumber));

  if (rows.length === 0 || !active) {
    return rows.map((r) => ({
      ...r,
      sectionId: null as string | null,
      sectionName: null as string | null,
      yearLevel: null as
        | ("YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4")
        | null,
    }));
  }

  const enrollmentRows = await db
    .select({
      studentId: enrollments.studentId,
      sectionId: enrollments.sectionId,
      sectionName: sections.name,
      yearLevel: enrollments.yearLevel,
    })
    .from(enrollments)
    .innerJoin(sections, eq(enrollments.sectionId, sections.id))
    .where(
      and(
        eq(enrollments.academicSessionId, active.id),
        inArray(
          enrollments.studentId,
          rows.map((r) => r.id),
        ),
      ),
    );

  const byStudent = new Map(enrollmentRows.map((e) => [e.studentId, e]));
  return rows.map((r) => {
    const e = byStudent.get(r.id);
    return {
      ...r,
      sectionId: e?.sectionId ?? null,
      sectionName: e?.sectionName ?? null,
      yearLevel: e?.yearLevel ?? null,
    };
  });
}

export async function listTeachers(departmentIds?: string[]) {
  return db
    .select({
      id: teachers.id,
      userId: teachers.userId,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      departmentId: teachers.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
    })
    .from(teachers)
    .innerJoin(user, eq(teachers.userId, user.id))
    .innerJoin(departments, eq(teachers.departmentId, departments.id))
    .where(
      departmentIds ? inArray(teachers.departmentId, departmentIds) : undefined,
    )
    .orderBy(asc(user.name));
}

export async function listHods() {
  return db
    .select({
      id: hodAssignments.id,
      userId: hodAssignments.userId,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      departmentId: hodAssignments.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
    })
    .from(hodAssignments)
    .innerJoin(user, eq(hodAssignments.userId, user.id))
    .innerJoin(departments, eq(hodAssignments.departmentId, departments.id))
    .orderBy(asc(departments.name));
}

/** Active sections of the active academic session, optionally dept-scoped. */
export async function listActiveSections(departmentIds?: string[]) {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  return db
    .select({
      id: sections.id,
      name: sections.name,
      yearLevel: sections.yearLevel,
      departmentId: sections.departmentId,
      departmentName: departments.name,
    })
    .from(sections)
    .innerJoin(departments, eq(sections.departmentId, departments.id))
    .where(
      and(
        eq(sections.academicSessionId, active.id),
        eq(sections.isActive, true),
        departmentIds
          ? inArray(sections.departmentId, departmentIds)
          : undefined,
      ),
    )
    .orderBy(asc(departments.name), asc(sections.yearLevel), asc(sections.name));
}
