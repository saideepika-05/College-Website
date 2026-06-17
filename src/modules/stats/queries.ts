import "server-only";

import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  assignmentTargets,
  attendanceRecords,
  attendanceSessions,
  branches,
  departments,
  enrollments,
  sections,
  students,
  subjects,
  teacherAssignments,
  teachers,
  timetableEntries,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";
import { JS_DAY_TO_ENUM, type DayOfWeek } from "@/lib/labels";

/**
 * Dashboard aggregates (SRS §23). All computed in SQL; every function is
 * scoped explicitly by its arguments — callers pass the viewer's scope.
 */

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function getAdminOverview() {
  const active = await getActiveAcademicSession();

  const totalsResult = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.is_active) ::int AS students,
      (SELECT count(*) FROM teachers t JOIN "user" u ON u.id = t.user_id WHERE u.is_active) ::int AS teachers,
      (SELECT count(*) FROM hod_assignments)::int AS hods,
      (SELECT count(*) FROM departments WHERE is_active)::int AS departments,
      (SELECT count(*) FROM branches WHERE is_active)::int AS branches
  `);

  const studentsPerBranch = await db
    .select({
      name: branches.name,
      value: count(students.id),
    })
    .from(students)
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .innerJoin(branches, eq(departments.branchId, branches.id))
    .groupBy(branches.name)
    .orderBy(desc(count(students.id)));

  const studentsPerDepartment = await db
    .select({
      name: departments.name,
      value: count(students.id),
    })
    .from(students)
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .groupBy(departments.name)
    .orderBy(desc(count(students.id)));

  const teachersPerDepartment = await db
    .select({
      name: departments.name,
      value: count(teachers.id),
    })
    .from(teachers)
    .innerJoin(departments, eq(teachers.departmentId, departments.id))
    .groupBy(departments.name)
    .orderBy(desc(count(teachers.id)));

  const attendanceTrend = active
    ? await getAttendanceTrend({ academicSessionId: active.id })
    : [];

  const t = totalsResult.rows[0] as unknown as {
    students: number;
    teachers: number;
    hods: number;
    departments: number;
    branches: number;
  };

  return {
    totals: t,
    studentsPerBranch,
    studentsPerDepartment,
    teachersPerDepartment,
    attendanceTrend,
    activeSessionLabel: active?.label ?? null,
  };
}

// ---------------------------------------------------------------------------
// Shared: daily attendance % trend over the last 30 days
// ---------------------------------------------------------------------------

export async function getAttendanceTrend(opts: {
  academicSessionId?: string;
  departmentIds?: string[];
  sectionId?: string;
  teacherId?: string;
  studentId?: string;
  days?: number;
}): Promise<{ date: string; percentage: number; total: number }[]> {
  const active = opts.academicSessionId
    ? { id: opts.academicSessionId }
    : await getActiveAcademicSession();
  if (!active) return [];

  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const rows = await db
    .select({
      date: attendanceSessions.classDate,
      present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'PRESENT')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
    .where(
      and(
        eq(attendanceSessions.academicSessionId, active.id),
        eq(attendanceSessions.status, "CLOSED"),
        gte(attendanceSessions.classDate, since),
        opts.departmentIds
          ? inArray(sections.departmentId, opts.departmentIds)
          : undefined,
        opts.sectionId
          ? eq(attendanceSessions.sectionId, opts.sectionId)
          : undefined,
        opts.teacherId
          ? eq(attendanceSessions.teacherId, opts.teacherId)
          : undefined,
        opts.studentId
          ? eq(attendanceRecords.studentId, opts.studentId)
          : undefined,
      ),
    )
    .groupBy(attendanceSessions.classDate)
    .orderBy(attendanceSessions.classDate);

  return rows.map((r) => ({
    date: r.date,
    total: r.total,
    percentage: r.total ? Math.round((r.present / r.total) * 100) : 0,
  }));
}

// ---------------------------------------------------------------------------
// HOD
// ---------------------------------------------------------------------------

export async function getHodOverview(departmentIds: string[]) {
  const active = await getActiveAcademicSession();

  const [studentCount] = await db
    .select({ c: count() })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .where(
      and(inArray(students.departmentId, departmentIds), eq(user.isActive, true)),
    );

  const [teacherCount] = await db
    .select({ c: count() })
    .from(teachers)
    .innerJoin(user, eq(teachers.userId, user.id))
    .where(
      and(inArray(teachers.departmentId, departmentIds), eq(user.isActive, true)),
    );

  const [sectionCount] = active
    ? await db
        .select({ c: count() })
        .from(sections)
        .where(
          and(
            inArray(sections.departmentId, departmentIds),
            eq(sections.academicSessionId, active.id),
            eq(sections.isActive, true),
          ),
        )
    : [{ c: 0 }];

  const [assignmentCount] = active
    ? await db
        .select({ c: count() })
        .from(assignments)
        .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
        .where(
          and(
            inArray(subjects.departmentId, departmentIds),
            eq(assignments.academicSessionId, active.id),
          ),
        )
    : [{ c: 0 }];

  // Students per year (distribution).
  const studentsByYear = active
    ? await db
        .select({
          yearLevel: enrollments.yearLevel,
          value: count(),
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .where(
          and(
            inArray(students.departmentId, departmentIds),
            eq(enrollments.academicSessionId, active.id),
            eq(enrollments.status, "ACTIVE"),
          ),
        )
        .groupBy(enrollments.yearLevel)
        .orderBy(enrollments.yearLevel)
    : [];

  // Section attendance performance (closed sessions, active session).
  const sectionPerformance = active
    ? await db
        .select({
          name: sections.name,
          present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'PRESENT')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(attendanceRecords)
        .innerJoin(
          attendanceSessions,
          eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
        )
        .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
        .where(
          and(
            inArray(sections.departmentId, departmentIds),
            eq(attendanceSessions.academicSessionId, active.id),
            eq(attendanceSessions.status, "CLOSED"),
          ),
        )
        .groupBy(sections.name)
        .orderBy(sections.name)
    : [];

  // Teacher workload: assignment pair count per teacher.
  const teacherWorkload = active
    ? await db
        .select({
          name: user.name,
          value: count(teacherAssignments.id),
        })
        .from(teacherAssignments)
        .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
        .innerJoin(user, eq(teachers.userId, user.id))
        .where(
          and(
            inArray(teachers.departmentId, departmentIds),
            eq(teacherAssignments.academicSessionId, active.id),
          ),
        )
        .groupBy(user.name)
        .orderBy(desc(count(teacherAssignments.id)))
        .limit(12)
    : [];

  const attendanceTrend = await getAttendanceTrend({ departmentIds });

  return {
    totals: {
      students: studentCount?.c ?? 0,
      teachers: teacherCount?.c ?? 0,
      sections: sectionCount?.c ?? 0,
      assignments: assignmentCount?.c ?? 0,
    },
    studentsByYear,
    sectionPerformance: sectionPerformance.map((s) => ({
      name: s.name,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    })),
    teacherWorkload,
    attendanceTrend,
  };
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

export async function getTeacherOverview(teacherId: string, userId: string) {
  const active = await getActiveAcademicSession();
  if (!active) {
    return {
      totals: { classes: 0, sessionsHeld: 0, activeAssignments: 0 },
      sectionTrends: [],
      subjectAttendance: [],
      attendanceTrend: [],
    };
  }

  const [pairCount] = await db
    .select({ c: count() })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.academicSessionId, active.id),
      ),
    );

  const [sessionCount] = await db
    .select({ c: count() })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.teacherId, teacherId),
        eq(attendanceSessions.academicSessionId, active.id),
      ),
    );

  const today = new Date().toISOString().slice(0, 10);
  const [activeAssignmentCount] = await db
    .select({ c: count() })
    .from(assignments)
    .where(
      and(
        eq(assignments.createdById, userId),
        eq(assignments.academicSessionId, active.id),
        gte(assignments.dueDate, today),
      ),
    );

  // Per-subject (per-class) attendance percentage for this teacher.
  const subjectAttendance = await db
    .select({
      name: sql<string>`${subjects.code} || ' · ' || ${sections.name}`,
      present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'PRESENT')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .innerJoin(subjects, eq(attendanceSessions.subjectId, subjects.id))
    .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
    .where(
      and(
        eq(attendanceSessions.teacherId, teacherId),
        eq(attendanceSessions.academicSessionId, active.id),
        eq(attendanceSessions.status, "CLOSED"),
      ),
    )
    .groupBy(subjects.code, sections.name)
    .orderBy(subjects.code);

  const attendanceTrend = await getAttendanceTrend({ teacherId });

  return {
    totals: {
      classes: pairCount?.c ?? 0,
      sessionsHeld: sessionCount?.c ?? 0,
      activeAssignments: activeAssignmentCount?.c ?? 0,
    },
    subjectAttendance: subjectAttendance.map((s) => ({
      name: s.name,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    })),
    attendanceTrend,
  };
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export async function getStudentOverview(
  studentId: string,
  sectionId: string | null,
) {
  const active = await getActiveAcademicSession();
  const todayEnum: DayOfWeek | null = JS_DAY_TO_ENUM[new Date().getDay()] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const todaysClasses =
    active && sectionId && todayEnum
      ? await db
          .select({
            periodNo: timetableEntries.periodNo,
            startTime: timetableEntries.startTime,
            endTime: timetableEntries.endTime,
            subjectName: subjects.name,
            subjectCode: subjects.code,
            teacherName: user.name,
          })
          .from(timetableEntries)
          .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
          .innerJoin(teachers, eq(timetableEntries.teacherId, teachers.id))
          .innerJoin(user, eq(teachers.userId, user.id))
          .where(
            and(
              eq(timetableEntries.sectionId, sectionId),
              eq(timetableEntries.academicSessionId, active.id),
              eq(timetableEntries.dayOfWeek, todayEnum),
            ),
          )
          .orderBy(timetableEntries.periodNo)
      : [];

  const upcomingAssignments =
    active && sectionId
      ? await db
          .select({
            id: assignments.id,
            title: assignments.title,
            dueDate: assignments.dueDate,
            subjectName: subjects.name,
            subjectCode: subjects.code,
          })
          .from(assignmentTargets)
          .innerJoin(
            assignments,
            eq(assignmentTargets.assignmentId, assignments.id),
          )
          .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
          .where(
            and(
              eq(assignmentTargets.sectionId, sectionId),
              eq(assignments.academicSessionId, active.id),
              gte(assignments.dueDate, today),
            ),
          )
          .orderBy(assignments.dueDate)
          .limit(5)
      : [];

  // Monthly (last-30-day) personal attendance trend.
  const attendanceTrend = await getAttendanceTrend({ studentId });

  return { todaysClasses, upcomingAssignments, attendanceTrend };
}
