import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/kit/empty-state";
import { StatCard } from "@/components/kit/stat-card";
import { AttendanceTrendChart } from "@/components/kit/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentScope } from "@/lib/authz";
import { formatDate, formatTime12h } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { getStudentAttendanceSummary } from "@/modules/attendance/queries";
import { getStudentOverview } from "@/modules/stats/queries";

export default async function StudentHomePage() {
  const user = await requireRole("STUDENT");
  const scope = await getStudentScope(user.id);

  if (!scope?.currentEnrollment) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Not enrolled"
        description="You are not enrolled in the active session — contact your department office."
      />
    );
  }

  const [overview, summary] = await Promise.all([
    getStudentOverview(scope.studentId, scope.currentEnrollment.sectionId),
    getStudentAttendanceSummary(scope.studentId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Hi, {user.name.split(" ")[0]}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          {scope.rollNumber}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Attendance" value={`${summary.overall.percentage}%`} />
        <StatCard label="Today" value={overview.todaysClasses.length} />
        <StatCard label="Due soon" value={overview.upcomingAssignments.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s classes</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.todaysClasses.length ? (
            <ul className="divide-y">
              {overview.todaysClasses.map((c) => (
                <li
                  key={c.periodNo}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    P{c.periodNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.subjectName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.teacherName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime12h(c.startTime)}–{formatTime12h(c.endTime)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No classes today 🎉
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance trend</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTrendChart data={overview.attendanceTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming assignments</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/student/assignments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {overview.upcomingAssignments.length ? (
            <ul className="divide-y">
              {overview.upcomingAssignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(a.dueDate)}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {a.subjectCode}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing due
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {summary.subjects.length ? (
            summary.subjects.map((s) => (
              <div key={s.subjectId} className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                  {s.subjectCode}
                </span>
                <span className="flex-1 truncate text-sm">{s.subjectName}</span>
                <span
                  className={`text-sm tabular-nums ${
                    s.percentage < 75 ? "font-medium text-destructive" : ""
                  }`}
                >
                  {s.percentage}%
                </span>
              </div>
            ))
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No attendance recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
