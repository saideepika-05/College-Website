import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getTeacherScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  teacherManualAttendance,
  teacherOpenAttendanceSession,
} from "@/modules/attendance/actions";
import {
  getRostersForSections,
  listAttendanceSessions,
} from "@/modules/attendance/queries";
import { ManualAttendanceButton } from "@/modules/attendance/components/manual-attendance";
import { SessionsTable } from "@/modules/attendance/components/sessions-table";
import {
  StartSessionButton,
  type ClassOption,
} from "@/modules/attendance/components/start-session";
import { listTeacherAssignments } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function TeacherAttendancePage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  const [allAssignments, sessions] = await Promise.all([
    listTeacherAssignments(),
    scope
      ? listAttendanceSessions({ teacherId: scope.teacherId })
      : Promise.resolve([]),
  ]);

  const classes: ClassOption[] = scope
    ? allAssignments
        .filter((a) => a.teacherId === scope.teacherId)
        .map((a) => ({
          subjectId: a.subjectId,
          subjectName: a.subjectName,
          subjectCode: a.subjectCode,
          sectionId: a.sectionId,
          sectionName: a.sectionName,
          yearLevel: a.yearLevel,
        }))
    : [];

  const rosters = await getRostersForSections([
    ...new Set(classes.map((c) => c.sectionId)),
  ]);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Generate a QR session and track scans live"
        actions={
          classes.length ? (
            <div className="flex gap-2">
              <ManualAttendanceButton
                classes={classes}
                rosters={rosters}
                action={teacherManualAttendance}
                detailHrefBase="/teacher/attendance"
              />
              <StartSessionButton
                classes={classes}
                action={teacherOpenAttendanceSession}
                detailHrefBase="/teacher/attendance"
              />
            </div>
          ) : undefined
        }
      />
      <SessionsTable sessions={sessions} hrefBase="/teacher/attendance" />
    </>
  );
}
