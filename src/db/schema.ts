import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", [
  "ADMIN",
  "HOD",
  "TEACHER",
  "STUDENT",
]);

export const yearLevel = pgEnum("year_level", [
  "YEAR_1",
  "YEAR_2",
  "YEAR_3",
  "YEAR_4",
]);

export const dayOfWeek = pgEnum("day_of_week", [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

export const attendanceStatus = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
]);

export const attendanceSessionStatus = pgEnum("attendance_session_status", [
  "OPEN",
  "CLOSED",
]);

export const markedVia = pgEnum("marked_via", ["QR", "MANUAL"]);

export const noticeType = pgEnum("notice_type", [
  "INSTITUTION",
  "DEPARTMENT",
  "SECTION",
]);

export const enrollmentStatus = pgEnum("enrollment_status", [
  "ACTIVE",
  "PROMOTED",
  "TRANSFERRED_OUT",
  "COMPLETED",
]);

const uuidPk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Auth (Better Auth core tables + role/status extensions)
// ---------------------------------------------------------------------------

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("STUDENT"),
    /** Account status — inactive users cannot sign in or act. */
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("user_email_idx").on(t.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("session_token_idx").on(t.token),
    index("session_user_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Academic structure
// ---------------------------------------------------------------------------

export const branches = pgTable(
  "branches",
  {
    id: uuidPk(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("branches_code_idx").on(t.code)],
);

export const departments = pgTable(
  "departments",
  {
    id: uuidPk(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("departments_branch_code_idx").on(t.branchId, t.code)],
);

export const academicSessions = pgTable(
  "academic_sessions",
  {
    id: uuidPk(),
    /** e.g. "2026-2027" */
    label: text("label").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("academic_sessions_label_idx").on(t.label),
    // At most one active academic session institution-wide.
    uniqueIndex("academic_sessions_single_active_idx")
      .on(t.isActive)
      .where(sql`${t.isActive} = true`),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuidPk(),
    /** e.g. "CSE-1A" */
    name: text("name").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    yearLevel: yearLevel("year_level").notNull(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sections_unique_idx").on(
      t.departmentId,
      t.academicSessionId,
      t.yearLevel,
      t.name,
    ),
    index("sections_session_idx").on(t.academicSessionId),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuidPk(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    yearLevel: yearLevel("year_level").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subjects_department_code_idx").on(t.departmentId, t.code),
  ],
);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const students = pgTable(
  "students",
  {
    id: uuidPk(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    rollNumber: text("roll_number").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("students_user_idx").on(t.userId),
    uniqueIndex("students_roll_idx").on(t.rollNumber),
    index("students_department_idx").on(t.departmentId),
  ],
);

export const teachers = pgTable(
  "teachers",
  {
    id: uuidPk(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("teachers_user_idx").on(t.userId),
    index("teachers_department_idx").on(t.departmentId),
  ],
);

export const hodAssignments = pgTable(
  "hod_assignments",
  {
    id: uuidPk(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    // One HOD per department.
    uniqueIndex("hod_assignments_department_idx").on(t.departmentId),
    index("hod_assignments_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Enrollment — the pivot of the data model. One row per student per session.
// Current section is always derived from the active session's enrollment.
// History is preserved by construction: promotion inserts a new row.
// ---------------------------------------------------------------------------

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuidPk(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "restrict" }),
    yearLevel: yearLevel("year_level").notNull(),
    status: enrollmentStatus("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("enrollments_student_session_idx").on(
      t.studentId,
      t.academicSessionId,
    ),
    index("enrollments_section_idx").on(t.sectionId),
    index("enrollments_session_idx").on(t.academicSessionId),
  ],
);

// ---------------------------------------------------------------------------
// Teaching
// ---------------------------------------------------------------------------

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuidPk(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "restrict" }),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("teacher_assignments_unique_idx").on(
      t.teacherId,
      t.subjectId,
      t.sectionId,
      t.academicSessionId,
    ),
    index("teacher_assignments_teacher_idx").on(t.teacherId),
    index("teacher_assignments_section_idx").on(t.sectionId),
  ],
);

export const timetableEntries = pgTable(
  "timetable_entries",
  {
    id: uuidPk(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    dayOfWeek: dayOfWeek("day_of_week").notNull(),
    periodNo: integer("period_no").notNull(),
    /** "09:00" 24h format */
    startTime: text("start_time").notNull(),
    /** "10:00" 24h format */
    endTime: text("end_time").notNull(),
    ...timestamps,
  },
  (t) => [
    // A section can't have two classes in the same slot.
    uniqueIndex("timetable_section_slot_idx").on(
      t.academicSessionId,
      t.sectionId,
      t.dayOfWeek,
      t.periodNo,
    ),
    // A teacher can't be in two rooms in the same slot.
    uniqueIndex("timetable_teacher_slot_idx").on(
      t.academicSessionId,
      t.teacherId,
      t.dayOfWeek,
      t.periodNo,
    ),
    index("timetable_section_idx").on(t.sectionId),
    index("timetable_teacher_idx").on(t.teacherId),
  ],
);

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuidPk(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "restrict" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    /**
     * Per-session random secret. Rotating QR tokens are derived as
     * HMAC(tokenSecret, floor(now / 30s)) — no DB write per rotation,
     * and a leaked token from one session is useless for any other.
     */
    tokenSecret: text("token_secret").notNull(),
    status: attendanceSessionStatus("status").notNull().default("OPEN"),
    /** Hard stop — scans rejected and session auto-closed after this. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** The class date this session records attendance for. */
    classDate: date("class_date").notNull(),
    /** Which hourly period (1–6) of the bell schedule this covers. */
    periodNo: integer("period_no").notNull(),
    ...timestamps,
  },
  (t) => [
    index("attendance_sessions_section_idx").on(t.sectionId),
    index("attendance_sessions_teacher_idx").on(t.teacherId),
    index("attendance_sessions_subject_idx").on(t.subjectId),
    index("attendance_sessions_class_date_idx").on(t.classDate),
    // A section is taught one class per period — so at most one attendance
    // session per (section, date, period). The final arbiter against
    // double-marking the same hour, even under concurrent opens.
    uniqueIndex("attendance_sessions_section_date_period_idx").on(
      t.sectionId,
      t.classDate,
      t.periodNo,
    ),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuidPk(),
    attendanceSessionId: text("attendance_session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    status: attendanceStatus("status").notNull(),
    markedVia: markedVia("marked_via").notNull().default("QR"),
    markedAt: timestamp("marked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastModifiedById: text("last_modified_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    // The final arbiter against double-marking, even under concurrent scans.
    uniqueIndex("attendance_records_session_student_idx").on(
      t.attendanceSessionId,
      t.studentId,
    ),
    index("attendance_records_student_idx").on(t.studentId),
  ],
);

// ---------------------------------------------------------------------------
// Assignments (informational — no submissions)
// ---------------------------------------------------------------------------

export const assignments = pgTable(
  "assignments",
  {
    id: uuidPk(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    assignedDate: date("assigned_date").notNull(),
    dueDate: date("due_date").notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    index("assignments_subject_idx").on(t.subjectId),
    index("assignments_due_idx").on(t.dueDate),
  ],
);

export const assignmentTargets = pgTable(
  "assignment_targets",
  {
    id: uuidPk(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("assignment_targets_unique_idx").on(
      t.assignmentId,
      t.sectionId,
    ),
    index("assignment_targets_section_idx").on(t.sectionId),
  ],
);

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export const notices = pgTable(
  "notices",
  {
    id: uuidPk(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: noticeType("type").notNull(),
    /** Set when type = DEPARTMENT. */
    departmentId: text("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("notices_type_idx").on(t.type),
    index("notices_department_idx").on(t.departmentId),
  ],
);

export const noticeTargets = pgTable(
  "notice_targets",
  {
    id: uuidPk(),
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("notice_targets_unique_idx").on(t.noticeId, t.sectionId),
    index("notice_targets_section_idx").on(t.sectionId),
  ],
);

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuidPk(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    /** Lets HODs see audit entries scoped to their department. */
    departmentId: text("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_department_idx").on(t.departmentId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);
