import "server-only";

import { and, eq, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  enrollments,
  sections,
  students,
  teacherAssignments,
  user,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { getActiveAcademicSession } from "@/lib/authz";
import { isUniqueViolation } from "@/lib/db-errors";
import { actionError } from "@/lib/safe-action";
import { getCurrentPeriod } from "./periods";
import { newSessionSecret, verifyToken } from "./token";

/** Every attendance session is open for a fixed 30-second scan window. */
export const SESSION_WINDOW_SECONDS = 30;

/**
 * Opens an attendance session for (section, subject) taught by `teacherId`.
 * Caller has already verified the actor may do this.
 */
export async function openSession(
  actorId: string,
  input: {
    teacherId: string;
    sectionId: string;
    subjectId: string;
  },
) {
  const active = await getActiveAcademicSession();
  if (!active) actionError("No active academic session.");

  // Attendance is hourly: the period is locked to the current clock time.
  const now = new Date();
  const period = getCurrentPeriod(now);
  if (!period) {
    actionError(
      "Attendance can only be taken during a scheduled period (9:40–4:10).",
    );
  }
  const classDate = new Date().toISOString().slice(0, 10);

  // One attendance session per (section, date, period). The DB unique index
  // is the final arbiter; this gives a friendly message before we get there.
  const [existing] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.sectionId, input.sectionId),
        eq(attendanceSessions.classDate, classDate),
        eq(attendanceSessions.periodNo, period!.no),
      ),
    )
    .limit(1);
  if (existing) {
    actionError(
      `Attendance for this section's period ${period!.no} (${period!.label}) has already been taken today.`,
    );
  }

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));
  if (!section) actionError("Section not found.");

  return db.transaction(async (tx) => {
    let row;
    try {
      [row] = await tx
        .insert(attendanceSessions)
        .values({
          academicSessionId: active!.id,
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
          tokenSecret: newSessionSecret(),
          status: "OPEN",
          expiresAt: new Date(now.getTime() + SESSION_WINDOW_SECONDS * 1_000),
          classDate,
          periodNo: period!.no,
        })
        .returning();
    } catch (e) {
      if (isUniqueViolation(e)) {
        actionError(
          `Attendance for this section's period ${period!.no} (${period!.label}) has already been taken today.`,
        );
      }
      throw e;
    }
    await audit(tx, {
      actorId,
      action: "ATTENDANCE_GENERATE",
      entityType: "attendanceSession",
      entityId: row!.id,
      after: {
        sectionId: row!.sectionId,
        subjectId: row!.subjectId,
        teacherId: row!.teacherId,
        expiresAt: row!.expiresAt,
      },
      departmentId: section!.departmentId,
    });
    return row!;
  });
}

/**
 * Records attendance manually (no QR) for the current period, creating an
 * already-CLOSED session. Every actively-enrolled student gets a record —
 * the status from `statuses`, defaulting to ABSENT. The client's student
 * list is never trusted; the roster is re-read server-side.
 */
export async function markManualAttendance(
  actorId: string,
  input: {
    teacherId: string;
    sectionId: string;
    subjectId: string;
    statuses: { studentId: string; status: "PRESENT" | "ABSENT" }[];
  },
) {
  const active = await getActiveAcademicSession();
  if (!active) actionError("No active academic session.");

  const now = new Date();
  const period = getCurrentPeriod(now);
  if (!period) {
    actionError(
      "Attendance can only be taken during a scheduled period (9:40–4:10).",
    );
  }
  const classDate = now.toISOString().slice(0, 10);

  const [existing] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.sectionId, input.sectionId),
        eq(attendanceSessions.classDate, classDate),
        eq(attendanceSessions.periodNo, period!.no),
      ),
    )
    .limit(1);
  if (existing) {
    actionError(
      `Attendance for this section's period ${period!.no} (${period!.label}) has already been taken today. Open it to edit.`,
    );
  }

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.id, input.sectionId));
  if (!section) actionError("Section not found.");

  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.sectionId, input.sectionId),
        eq(enrollments.academicSessionId, active!.id),
        eq(enrollments.status, "ACTIVE"),
      ),
    );
  if (enrolled.length === 0) {
    actionError("No students are enrolled in this section.");
  }

  const statusMap = new Map(input.statuses.map((s) => [s.studentId, s.status]));

  return db.transaction(async (tx) => {
    let sess;
    try {
      [sess] = await tx
        .insert(attendanceSessions)
        .values({
          academicSessionId: active!.id,
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
          tokenSecret: newSessionSecret(),
          status: "CLOSED",
          expiresAt: now,
          closedAt: now,
          classDate,
          periodNo: period!.no,
        })
        .returning();
    } catch (e) {
      if (isUniqueViolation(e)) {
        actionError(
          `Attendance for this section's period ${period!.no} (${period!.label}) has already been taken today. Open it to edit.`,
        );
      }
      throw e;
    }

    await tx.insert(attendanceRecords).values(
      enrolled.map((e) => ({
        attendanceSessionId: sess!.id,
        studentId: e.studentId,
        status: statusMap.get(e.studentId) ?? ("ABSENT" as const),
        markedVia: "MANUAL" as const,
        lastModifiedById: actorId,
      })),
    );

    await audit(tx, {
      actorId,
      action: "ATTENDANCE_MARK",
      entityType: "attendanceSession",
      entityId: sess!.id,
      after: {
        sectionId: sess!.sectionId,
        subjectId: sess!.subjectId,
        periodNo: sess!.periodNo,
        present: input.statuses.filter((s) => s.status === "PRESENT").length,
        total: enrolled.length,
      },
      departmentId: section!.departmentId,
    });

    return sess!;
  });
}

export type ScanResult =
  | { ok: true; subjectName?: string }
  | { ok: false; reason: string };

/**
 * The SRS §18 validation chain. Marks the logged-in student PRESENT.
 * The unique (session, student) constraint is the final arbiter under
 * concurrent double-scans.
 */
export async function markByScan(
  studentUserId: string,
  sessionId: string,
  token: string,
): Promise<ScanResult> {
  const [student] = await db
    .select({ id: students.id, isActive: user.isActive })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .where(eq(students.userId, studentUserId));
  if (!student) return { ok: false, reason: "No student profile found." };
  if (!student.isActive) {
    return { ok: false, reason: "Your account is deactivated." };
  }

  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId));
  if (!session) return { ok: false, reason: "Attendance session not found." };
  if (session.status !== "OPEN") {
    return { ok: false, reason: "This attendance session has been closed." };
  }
  if (session.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This attendance session has expired." };
  }
  if (!verifyToken(sessionId, session.tokenSecret, token)) {
    return {
      ok: false,
      reason: "QR code expired — scan the one on screen now.",
    };
  }

  // The student must be ACTIVELY enrolled in this session's section.
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, student.id),
        eq(enrollments.sectionId, session.sectionId),
        eq(enrollments.academicSessionId, session.academicSessionId),
        eq(enrollments.status, "ACTIVE"),
      ),
    );
  if (!enrollment) {
    return { ok: false, reason: "You are not enrolled in this section." };
  }

  try {
    await db.insert(attendanceRecords).values({
      attendanceSessionId: sessionId,
      studentId: student.id,
      status: "PRESENT",
      markedVia: "QR",
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, reason: "Your attendance is already marked." };
    }
    throw e;
  }

  return { ok: true };
}

/**
 * Closes a session and backfills ABSENT for every actively-enrolled
 * student in the section without a record — one INSERT…SELECT.
 */
export async function closeSession(
  actorId: string | null,
  sessionId: string,
) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId));
  if (!session) actionError("Attendance session not found.");
  if (session!.status === "CLOSED") actionError("Session is already closed.");

  const [section] = await db
    .select({ departmentId: sections.departmentId })
    .from(sections)
    .where(eq(sections.id, session!.sectionId));

  await db.transaction(async (tx) => {
    const marked = tx
      .select({ studentId: attendanceRecords.studentId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.attendanceSessionId, sessionId));

    await tx.execute(sql`
      INSERT INTO attendance_records
        (id, attendance_session_id, student_id, status, marked_via, marked_at, created_at, updated_at)
      SELECT
        gen_random_uuid()::text, ${sessionId}, e.student_id, 'ABSENT', 'MANUAL', now(), now(), now()
      FROM enrollments e
      WHERE e.section_id = ${session!.sectionId}
        AND e.academic_session_id = ${session!.academicSessionId}
        AND e.status = 'ACTIVE'
        AND e.student_id NOT IN (${marked})
    `);

    const [after] = await tx
      .update(attendanceSessions)
      .set({ status: "CLOSED", closedAt: new Date() })
      .where(eq(attendanceSessions.id, sessionId))
      .returning();

    await audit(tx, {
      actorId,
      action: "ATTENDANCE_CLOSE",
      entityType: "attendanceSession",
      entityId: sessionId,
      after: { closedAt: after!.closedAt },
      departmentId: section?.departmentId ?? null,
    });
  });
}

/** Auto-close every OPEN session past its expiry (cron safety net). */
export async function closeExpiredSessions(): Promise<number> {
  const expired = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.status, "OPEN"),
        lt(attendanceSessions.expiresAt, new Date()),
        isNull(attendanceSessions.closedAt),
      ),
    );
  for (const s of expired) {
    await closeSession(null, s.id);
  }
  return expired.length;
}

/** Flips one attendance record (teacher edit) with a full audit trail. */
export async function editRecord(
  actorId: string,
  recordId: string,
  status: "PRESENT" | "ABSENT",
) {
  const [existing] = await db
    .select({
      record: attendanceRecords,
      departmentId: sections.departmentId,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.attendanceSessionId, attendanceSessions.id),
    )
    .innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
    .where(eq(attendanceRecords.id, recordId));
  if (!existing) actionError("Attendance record not found.");
  if (existing!.record.status === status) return;

  await db.transaction(async (tx) => {
    await tx
      .update(attendanceRecords)
      .set({ status, markedVia: "MANUAL", lastModifiedById: actorId })
      .where(eq(attendanceRecords.id, recordId));
    await audit(tx, {
      actorId,
      action: "ATTENDANCE_EDIT",
      entityType: "attendanceRecord",
      entityId: recordId,
      before: { status: existing!.record.status },
      after: { status },
      departmentId: existing!.departmentId,
    });
  });
}

/** Session row + authorization helpers. */
export async function getSessionRow(sessionId: string) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId));
  return session ?? null;
}

/** True while a session is OPEN and not yet past its expiry. */
export function isSessionLive(session: {
  status: "OPEN" | "CLOSED";
  expiresAt: Date;
}): boolean {
  return session.status === "OPEN" && session.expiresAt.getTime() > Date.now();
}

/** True when the (subject, section) of the session is among teacher pairs. */
export function sessionMatchesPairs(
  session: { subjectId: string; sectionId: string },
  pairs: { subjectId: string; sectionId: string }[],
): boolean {
  return pairs.some(
    (p) =>
      p.subjectId === session.subjectId && p.sectionId === session.sectionId,
  );
}

/** Resolve the assigned teacher for (section, subject) — used by HOD/admin. */
export async function assignedTeacherFor(
  sectionId: string,
  subjectId: string,
): Promise<string | null> {
  const active = await getActiveAcademicSession();
  if (!active) return null;
  const rows = await db
    .select({ teacherId: teacherAssignments.teacherId })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.sectionId, sectionId),
        eq(teacherAssignments.subjectId, subjectId),
        eq(teacherAssignments.academicSessionId, active.id),
      ),
    );
  return rows.length === 1 ? rows[0]!.teacherId : null;
}
