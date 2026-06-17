import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  departments,
  sections,
  subjects,
  teacherAssignments,
  teachers,
  timetableEntries,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";

/** Teacher↔subject↔section assignments in the active session. */
export async function listTeacherAssignments(departmentIds?: string[]) {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  return db
    .select({
      id: teacherAssignments.id,
      teacherId: teacherAssignments.teacherId,
      teacherName: user.name,
      subjectId: teacherAssignments.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      sectionId: teacherAssignments.sectionId,
      sectionName: sections.name,
      yearLevel: sections.yearLevel,
      departmentId: teachers.departmentId,
      departmentName: departments.name,
    })
    .from(teacherAssignments)
    .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
    .innerJoin(user, eq(teachers.userId, user.id))
    .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
    .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
    .innerJoin(departments, eq(teachers.departmentId, departments.id))
    .where(
      and(
        eq(teacherAssignments.academicSessionId, active.id),
        departmentIds
          ? inArray(teachers.departmentId, departmentIds)
          : undefined,
      ),
    )
    .orderBy(asc(user.name), asc(sections.name));
}

/** Active teachers for assignment dropdowns, optionally dept-scoped. */
export async function listTeacherOptions(departmentIds?: string[]) {
  return db
    .select({
      id: teachers.id,
      name: user.name,
      departmentId: teachers.departmentId,
    })
    .from(teachers)
    .innerJoin(user, eq(teachers.userId, user.id))
    .where(
      and(
        eq(user.isActive, true),
        departmentIds
          ? inArray(teachers.departmentId, departmentIds)
          : undefined,
      ),
    )
    .orderBy(asc(user.name));
}

/** Active subjects for dropdowns, optionally dept-scoped. */
export async function listSubjectOptions(departmentIds?: string[]) {
  return db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      yearLevel: subjects.yearLevel,
      departmentId: subjects.departmentId,
    })
    .from(subjects)
    .where(
      and(
        eq(subjects.isActive, true),
        departmentIds
          ? inArray(subjects.departmentId, departmentIds)
          : undefined,
      ),
    )
    .orderBy(asc(subjects.yearLevel), asc(subjects.name));
}

export type TimetableCell = {
  id: string;
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
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  sectionId: string;
  sectionName: string;
};

/** Full weekly timetable for one section (active session). */
export async function getSectionTimetable(
  sectionId: string,
): Promise<TimetableCell[]> {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  return db
    .select({
      id: timetableEntries.id,
      dayOfWeek: timetableEntries.dayOfWeek,
      periodNo: timetableEntries.periodNo,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      subjectId: timetableEntries.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: timetableEntries.teacherId,
      teacherName: user.name,
      sectionId: timetableEntries.sectionId,
      sectionName: sections.name,
    })
    .from(timetableEntries)
    .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
    .innerJoin(teachers, eq(timetableEntries.teacherId, teachers.id))
    .innerJoin(user, eq(teachers.userId, user.id))
    .innerJoin(sections, eq(timetableEntries.sectionId, sections.id))
    .where(
      and(
        eq(timetableEntries.sectionId, sectionId),
        eq(timetableEntries.academicSessionId, active.id),
      ),
    )
    .orderBy(asc(timetableEntries.dayOfWeek), asc(timetableEntries.periodNo));
}

/** Full weekly timetable for one teacher (active session). */
export async function getTeacherTimetable(
  teacherId: string,
): Promise<TimetableCell[]> {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  return db
    .select({
      id: timetableEntries.id,
      dayOfWeek: timetableEntries.dayOfWeek,
      periodNo: timetableEntries.periodNo,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      subjectId: timetableEntries.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: timetableEntries.teacherId,
      teacherName: user.name,
      sectionId: timetableEntries.sectionId,
      sectionName: sections.name,
    })
    .from(timetableEntries)
    .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
    .innerJoin(teachers, eq(timetableEntries.teacherId, teachers.id))
    .innerJoin(user, eq(teachers.userId, user.id))
    .innerJoin(sections, eq(timetableEntries.sectionId, sections.id))
    .where(
      and(
        eq(timetableEntries.teacherId, teacherId),
        eq(timetableEntries.academicSessionId, active.id),
      ),
    )
    .orderBy(asc(timetableEntries.dayOfWeek), asc(timetableEntries.periodNo));
}
