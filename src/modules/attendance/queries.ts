import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  enrollments,
  sections,
  students,
  subjects,
  teachers,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";

export type AttendanceSessionListRow = {
  id: string;
  status: "OPEN" | "CLOSED";
  classDate: string;
  periodNo: number;
  createdAt: Date;
  expiresAt: Date;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  presentCount: number;
  totalCount: number;
};

/** Recent sessions, scoped by teacher, departments, or neither (admin). */
export async function listAttendanceSessions(opts: {
  teacherId?: string;
  departmentIds?: string[];
  limit?: number;
}): Promise<AttendanceSessionListRow[]> {
  const active = await getActiveAcademicSession();
  if (!active) return [];

  const rows = await db
    .select({
      id: attendanceSessions.id,
      status: attendanceSessions.status,
      classDate: attendanceSessions.classDate,
      periodNo: attendanceSessions.periodNo,
      createdAt: attendanceSessions.createdAt,
      expiresAt: attendanceSessions.expiresAt,
      sectionId: attendanceSessions.sectionId,
      sectionName: sections.name,
      subjectId: attendanceSessions.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherName: user.name,
      presentCount: sql<number>`(
        SELECT count(*)::int FROM attendance_records ar
        WHERE ar.attendance_session_id = ${attendanceSessions.id}
          AND ar.status = 'PRESENT'
      )`,
      totalCount: sql<number>`(
        SELECT count(*)::int FROM attendance_records ar
        WHERE ar.attendance_session_id = ${attendanceSessions.id}
      )`,
    })
    .from(attendanceSessions)
    .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .innerJoin(teachers, eq(attendanceSessions.teacherId, teachers.id))
    .innerJoin(user, eq(teachers.userId, user.id))
    .where(
      and(
        eq(attendanceSessions.academicSessionId, active.id),
        opts.teacherId
          ? eq(attendanceSessions.teacherId, opts.teacherId)
          : undefined,
        opts.departmentIds
          ? inArray(sections.departmentId, opts.departmentIds)
          : undefined,
      ),
    )
    .orderBy(desc(attendanceSessions.createdAt))
    .limit(opts.limit ?? 50);

  return rows;
}

export type SessionDetail = {
  session: {
    id: string;
    status: "OPEN" | "CLOSED";
    classDate: string;
    periodNo: number;
    createdAt: Date;
    expiresAt: Date;
    closedAt: Date | null;
    sectionId: string;
    sectionName: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    teacherId: string;
    teacherName: string;
    departmentId: string;
  };
  records: {
    id: string;
    studentId: string;
    rollNumber: string;
    studentName: string;
    status: "PRESENT" | "ABSENT";
    markedVia: "QR" | "MANUAL";
    markedAt: Date;
  }[];
  enrolledCount: number;
};

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const [session] = await db
    .select({
      id: attendanceSessions.id,
      status: attendanceSessions.status,
      classDate: attendanceSessions.classDate,
      periodNo: attendanceSessions.periodNo,
      createdAt: attendanceSessions.createdAt,
      expiresAt: attendanceSessions.expiresAt,
      closedAt: attendanceSessions.closedAt,
      sectionId: attendanceSessions.sectionId,
      sectionName: sections.name,
      subjectId: attendanceSessions.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: attendanceSessions.teacherId,
      teacherName: user.name,
      departmentId: sections.departmentId,
      academicSessionId: attendanceSessions.academicSessionId,
    })
    .from(attendanceSessions)
    .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .innerJoin(teachers, eq(attendanceSessions.teacherId, teachers.id))
    .innerJoin(user, eq(teachers.userId, user.id))
    .where(eq(attendanceSessions.id, sessionId));
  if (!session) return null;

  const records = await db
    .select({
      id: attendanceRecords.id,
      studentId: attendanceRecords.studentId,
      rollNumber: students.rollNumber,
      studentName: user.name,
      status: attendanceRecords.status,
      markedVia: attendanceRecords.markedVia,
      markedAt: attendanceRecords.markedAt,
    })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(user, eq(students.userId, user.id))
    .where(eq(attendanceRecords.attendanceSessionId, sessionId))
    .orderBy(students.rollNumber);

  const [enrolled] = await db
    .select({ c: count() })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.sectionId, session.sectionId),
        eq(enrollments.academicSessionId, session.academicSessionId),
        eq(enrollments.status, "ACTIVE"),
      ),
    );

  return {
    session,
    records,
    enrolledCount: enrolled?.c ?? 0,
  };
}

export type StudentSubjectAttendance = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  present: number;
  total: number;
  percentage: number;
};

/** Per-subject attendance for a student in the active session. */
export async function getStudentAttendanceSummary(studentId: string): Promise<{
  overall: { present: number; total: number; percentage: number };
  subjects: StudentSubjectAttendance[];
}> {
  const active = await getActiveAcademicSession();
  if (!active) {
    return { overall: { present: 0, total: 0, percentage: 0 }, subjects: [] };
  }

  const rows = await db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'PRESENT')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .where(
      and(
        eq(attendanceRecords.studentId, studentId),
        eq(attendanceSessions.academicSessionId, active.id),
        eq(attendanceSessions.status, "CLOSED"),
      ),
    )
    .groupBy(subjects.id, subjects.name, subjects.code)
    .orderBy(subjects.name);

  const subjectsOut = rows.map((r) => ({
    ...r,
    percentage: r.total ? Math.round((r.present / r.total) * 100) : 0,
  }));
  const present = rows.reduce((a, r) => a + r.present, 0);
  const total = rows.reduce((a, r) => a + r.total, 0);

  return {
    overall: {
      present,
      total,
      percentage: total ? Math.round((present / total) * 100) : 0,
    },
    subjects: subjectsOut,
  };
}

/** Recent attendance history for a student (closed sessions). */
export async function getStudentAttendanceHistory(
  studentId: string,
  limit = 60,
) {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  return db
    .select({
      id: attendanceRecords.id,
      classDate: attendanceSessions.classDate,
      periodNo: attendanceSessions.periodNo,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      status: attendanceRecords.status,
      markedAt: attendanceRecords.markedAt,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .where(
      and(
        eq(attendanceRecords.studentId, studentId),
        eq(attendanceSessions.academicSessionId, active.id),
        eq(attendanceSessions.status, "CLOSED"),
      ),
    )
    .orderBy(desc(attendanceSessions.classDate), desc(attendanceRecords.markedAt))
    .limit(limit);
}

export type RosterStudent = {
  studentId: string;
  rollNumber: string;
  name: string;
};

/**
 * Actively-enrolled students for each section, keyed by sectionId — used to
 * populate the manual attendance roster.
 */
export async function getRostersForSections(
  sectionIds: string[],
): Promise<Record<string, RosterStudent[]>> {
  const active = await getActiveAcademicSession();
  if (!active || sectionIds.length === 0) return {};

  const rows = await db
    .select({
      sectionId: enrollments.sectionId,
      studentId: students.id,
      rollNumber: students.rollNumber,
      name: user.name,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(user, eq(students.userId, user.id))
    .where(
      and(
        inArray(enrollments.sectionId, sectionIds),
        eq(enrollments.academicSessionId, active.id),
        eq(enrollments.status, "ACTIVE"),
      ),
    )
    .orderBy(students.rollNumber);

  const out: Record<string, RosterStudent[]> = {};
  for (const r of rows) {
    (out[r.sectionId] ??= []).push({
      studentId: r.studentId,
      rollNumber: r.rollNumber,
      name: r.name,
    });
  }
  return out;
}
