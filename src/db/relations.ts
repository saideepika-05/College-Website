import { relations } from "drizzle-orm";
import {
  academicSessions,
  account,
  assignments,
  assignmentTargets,
  attendanceRecords,
  attendanceSessions,
  auditLogs,
  branches,
  departments,
  enrollments,
  hodAssignments,
  notices,
  noticeTargets,
  sections,
  session,
  students,
  subjects,
  teacherAssignments,
  teachers,
  timetableEntries,
  user,
} from "./schema";

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  student: one(students, {
    fields: [user.id],
    references: [students.userId],
  }),
  teacher: one(teachers, {
    fields: [user.id],
    references: [teachers.userId],
  }),
  hodAssignments: many(hodAssignments),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const branchRelations = relations(branches, ({ many }) => ({
  departments: many(departments),
}));

export const departmentRelations = relations(departments, ({ one, many }) => ({
  branch: one(branches, {
    fields: [departments.branchId],
    references: [branches.id],
  }),
  sections: many(sections),
  subjects: many(subjects),
  students: many(students),
  teachers: many(teachers),
  hodAssignments: many(hodAssignments),
}));

export const academicSessionRelations = relations(
  academicSessions,
  ({ many }) => ({
    sections: many(sections),
    enrollments: many(enrollments),
    teacherAssignments: many(teacherAssignments),
    timetableEntries: many(timetableEntries),
    attendanceSessions: many(attendanceSessions),
    assignments: many(assignments),
  }),
);

export const sectionRelations = relations(sections, ({ one, many }) => ({
  department: one(departments, {
    fields: [sections.departmentId],
    references: [departments.id],
  }),
  academicSession: one(academicSessions, {
    fields: [sections.academicSessionId],
    references: [academicSessions.id],
  }),
  enrollments: many(enrollments),
  teacherAssignments: many(teacherAssignments),
  timetableEntries: many(timetableEntries),
  attendanceSessions: many(attendanceSessions),
  assignmentTargets: many(assignmentTargets),
  noticeTargets: many(noticeTargets),
}));

export const subjectRelations = relations(subjects, ({ one, many }) => ({
  department: one(departments, {
    fields: [subjects.departmentId],
    references: [departments.id],
  }),
  teacherAssignments: many(teacherAssignments),
  timetableEntries: many(timetableEntries),
  attendanceSessions: many(attendanceSessions),
  assignments: many(assignments),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
  user: one(user, { fields: [students.userId], references: [user.id] }),
  department: one(departments, {
    fields: [students.departmentId],
    references: [departments.id],
  }),
  enrollments: many(enrollments),
  attendanceRecords: many(attendanceRecords),
}));

export const teacherRelations = relations(teachers, ({ one, many }) => ({
  user: one(user, { fields: [teachers.userId], references: [user.id] }),
  department: one(departments, {
    fields: [teachers.departmentId],
    references: [departments.id],
  }),
  assignments: many(teacherAssignments),
  timetableEntries: many(timetableEntries),
  attendanceSessions: many(attendanceSessions),
}));

export const hodAssignmentRelations = relations(hodAssignments, ({ one }) => ({
  user: one(user, {
    fields: [hodAssignments.userId],
    references: [user.id],
  }),
  department: one(departments, {
    fields: [hodAssignments.departmentId],
    references: [departments.id],
  }),
}));

export const enrollmentRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  academicSession: one(academicSessions, {
    fields: [enrollments.academicSessionId],
    references: [academicSessions.id],
  }),
  section: one(sections, {
    fields: [enrollments.sectionId],
    references: [sections.id],
  }),
}));

export const teacherAssignmentRelations = relations(
  teacherAssignments,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [teacherAssignments.teacherId],
      references: [teachers.id],
    }),
    subject: one(subjects, {
      fields: [teacherAssignments.subjectId],
      references: [subjects.id],
    }),
    section: one(sections, {
      fields: [teacherAssignments.sectionId],
      references: [sections.id],
    }),
    academicSession: one(academicSessions, {
      fields: [teacherAssignments.academicSessionId],
      references: [academicSessions.id],
    }),
  }),
);

export const timetableEntryRelations = relations(
  timetableEntries,
  ({ one }) => ({
    academicSession: one(academicSessions, {
      fields: [timetableEntries.academicSessionId],
      references: [academicSessions.id],
    }),
    section: one(sections, {
      fields: [timetableEntries.sectionId],
      references: [sections.id],
    }),
    subject: one(subjects, {
      fields: [timetableEntries.subjectId],
      references: [subjects.id],
    }),
    teacher: one(teachers, {
      fields: [timetableEntries.teacherId],
      references: [teachers.id],
    }),
  }),
);

export const attendanceSessionRelations = relations(
  attendanceSessions,
  ({ one, many }) => ({
    academicSession: one(academicSessions, {
      fields: [attendanceSessions.academicSessionId],
      references: [academicSessions.id],
    }),
    section: one(sections, {
      fields: [attendanceSessions.sectionId],
      references: [sections.id],
    }),
    subject: one(subjects, {
      fields: [attendanceSessions.subjectId],
      references: [subjects.id],
    }),
    teacher: one(teachers, {
      fields: [attendanceSessions.teacherId],
      references: [teachers.id],
    }),
    records: many(attendanceRecords),
  }),
);

export const attendanceRecordRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendanceRecords.attendanceSessionId],
      references: [attendanceSessions.id],
    }),
    student: one(students, {
      fields: [attendanceRecords.studentId],
      references: [students.id],
    }),
    lastModifiedBy: one(user, {
      fields: [attendanceRecords.lastModifiedById],
      references: [user.id],
    }),
  }),
);

export const assignmentRelations = relations(assignments, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
  academicSession: one(academicSessions, {
    fields: [assignments.academicSessionId],
    references: [academicSessions.id],
  }),
  createdBy: one(user, {
    fields: [assignments.createdById],
    references: [user.id],
  }),
  targets: many(assignmentTargets),
}));

export const assignmentTargetRelations = relations(
  assignmentTargets,
  ({ one }) => ({
    assignment: one(assignments, {
      fields: [assignmentTargets.assignmentId],
      references: [assignments.id],
    }),
    section: one(sections, {
      fields: [assignmentTargets.sectionId],
      references: [sections.id],
    }),
  }),
);

export const noticeRelations = relations(notices, ({ one, many }) => ({
  department: one(departments, {
    fields: [notices.departmentId],
    references: [departments.id],
  }),
  createdBy: one(user, {
    fields: [notices.createdById],
    references: [user.id],
  }),
  targets: many(noticeTargets),
}));

export const noticeTargetRelations = relations(noticeTargets, ({ one }) => ({
  notice: one(notices, {
    fields: [noticeTargets.noticeId],
    references: [notices.id],
  }),
  section: one(sections, {
    fields: [noticeTargets.sectionId],
    references: [sections.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  actor: one(user, { fields: [auditLogs.actorId], references: [user.id] }),
  department: one(departments, {
    fields: [auditLogs.departmentId],
    references: [departments.id],
  }),
}));
