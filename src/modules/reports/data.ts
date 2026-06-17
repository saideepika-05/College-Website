import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  enrollments,
  sections,
  students,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";
import { YEAR_LABELS, formatDate } from "@/lib/labels";
import { listAssignments } from "@/modules/coursework/queries";
import { listStudents, listTeachers } from "@/modules/people/queries";

/**
 * Report data builders. Each returns a uniform shape the exporters
 * (CSV / Excel / PDF) consume without knowing the report's semantics.
 */

export type ReportColumn = { key: string; header: string; width?: number };

export type ReportData = {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
};

/** Per-student attendance for one section in the active academic session. */
export async function sectionAttendanceReport(
  sectionId: string,
): Promise<ReportData> {
  const [section] = await db
    .select({ id: sections.id, name: sections.name })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);

  const title = `Attendance Report — ${section?.name ?? "Unknown section"}`;
  const columns: ReportColumn[] = [
    { key: "rollNumber", header: "Roll Number", width: 18 },
    { key: "name", header: "Name", width: 28 },
    { key: "present", header: "Present", width: 12 },
    { key: "total", header: "Total Classes", width: 14 },
    { key: "percentage", header: "Percentage", width: 12 },
  ];

  const active = await getActiveAcademicSession();
  if (!section || !active) return { title, columns, rows: [] };

  const roster = await db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      name: user.name,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(user, eq(students.userId, user.id))
    .where(
      and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.academicSessionId, active.id),
        eq(enrollments.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(students.rollNumber));

  const attendance = await db
    .select({
      studentId: attendanceRecords.studentId,
      present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'PRESENT')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .where(
      and(
        eq(attendanceSessions.sectionId, sectionId),
        eq(attendanceSessions.status, "CLOSED"),
        eq(attendanceSessions.academicSessionId, active.id),
      ),
    )
    .groupBy(attendanceRecords.studentId);

  const byStudent = new Map(attendance.map((a) => [a.studentId, a]));

  const rows = roster.map((s) => {
    const a = byStudent.get(s.studentId);
    const present = a?.present ?? 0;
    const total = a?.total ?? 0;
    return {
      rollNumber: s.rollNumber,
      name: s.name,
      present,
      total,
      percentage: total ? `${Math.round((present / total) * 100)}%` : "—",
    };
  });

  return { title, columns, rows };
}

/** All students (optionally department-scoped) with current enrollment. */
export async function studentRosterReport(
  departmentIds?: string[],
): Promise<ReportData> {
  const rows = await listStudents(departmentIds);
  return {
    title: "Student Roster",
    columns: [
      { key: "rollNumber", header: "Roll Number", width: 18 },
      { key: "name", header: "Name", width: 28 },
      { key: "email", header: "Email", width: 32 },
      { key: "departmentName", header: "Department", width: 24 },
      { key: "sectionName", header: "Section", width: 16 },
      { key: "year", header: "Year", width: 12 },
      { key: "status", header: "Status", width: 12 },
    ],
    rows: rows.map((s) => ({
      rollNumber: s.rollNumber,
      name: s.name,
      email: s.email,
      departmentName: s.departmentName,
      sectionName: s.sectionName ?? "—",
      year: s.yearLevel ? YEAR_LABELS[s.yearLevel] : "—",
      status: s.isActive ? "Active" : "Inactive",
    })),
  };
}

/** All teachers (optionally department-scoped). */
export async function teacherRosterReport(
  departmentIds?: string[],
): Promise<ReportData> {
  const rows = await listTeachers(departmentIds);
  return {
    title: "Teacher Roster",
    columns: [
      { key: "name", header: "Name", width: 28 },
      { key: "email", header: "Email", width: 32 },
      { key: "departmentName", header: "Department", width: 24 },
      { key: "status", header: "Status", width: 12 },
    ],
    rows: rows.map((t) => ({
      name: t.name,
      email: t.email,
      departmentName: t.departmentName,
      status: t.isActive ? "Active" : "Inactive",
    })),
  };
}

/** Assignments in the active academic session (optionally dept-scoped). */
export async function assignmentReport(
  departmentIds?: string[],
): Promise<ReportData> {
  const rows = await listAssignments({ departmentIds });
  return {
    title: "Assignment Report",
    columns: [
      { key: "title", header: "Title", width: 32 },
      { key: "subject", header: "Subject", width: 28 },
      { key: "sections", header: "Sections", width: 24 },
      { key: "assignedDate", header: "Assigned", width: 14 },
      { key: "dueDate", header: "Due", width: 14 },
      { key: "createdByName", header: "Created By", width: 24 },
    ],
    rows: rows.map((a) => ({
      title: a.title,
      subject: `${a.subjectCode} — ${a.subjectName}`,
      sections: a.targetSections.join(", "),
      assignedDate: formatDate(a.assignedDate),
      dueDate: formatDate(a.dueDate),
      createdByName: a.createdByName,
    })),
  };
}
