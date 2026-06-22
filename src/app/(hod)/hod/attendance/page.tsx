import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  hodManualAttendance,
  hodOpenAttendanceSession,
} from "@/modules/attendance/actions";
import { ManualAttendanceButton } from "@/modules/attendance/components/manual-attendance";
import { SessionsTable } from "@/modules/attendance/components/sessions-table";
import {
  StartSessionButton,
  type ClassOption,
} from "@/modules/attendance/components/start-session";
import {
  getRostersForSections,
  listAttendanceSessions,
} from "@/modules/attendance/queries";
import { listTeacherAssignments } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function HodAttendancePage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [assignments, sessions] = await Promise.all([
    listTeacherAssignments(departmentIds),
    listAttendanceSessions({ departmentIds }),
  ]);

  // Each assigned (subject, section) pair is startable by the HOD; the
  // session is attributed to the assigned teacher.
  const seen = new Set<string>();
  const classes: ClassOption[] = [];
  for (const a of assignments) {
    const key = `${a.subjectId}|${a.sectionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    classes.push({
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      subjectCode: a.subjectCode,
      sectionId: a.sectionId,
      sectionName: a.sectionName,
      yearLevel: a.yearLevel,
    });
  }

  const rosters = await getRostersForSections([
    ...new Set(classes.map((c) => c.sectionId)),
  ]);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Department attendance sessions"
        actions={
          classes.length ? (
            <div className="flex gap-2">
              <ManualAttendanceButton
                classes={classes}
                rosters={rosters}
                action={hodManualAttendance}
                detailHrefBase="/hod/attendance"
              />
              <StartSessionButton
                classes={classes}
                action={hodOpenAttendanceSession}
                detailHrefBase="/hod/attendance"
              />
            </div>
          ) : undefined
        }
      />
      <SessionsTable sessions={sessions} hrefBase="/hod/attendance" />
    </>
  );
}
