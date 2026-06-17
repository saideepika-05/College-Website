import { CalendarCheck, CheckCircle2, Percent } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStudentScope } from "@/lib/authz";
import { formatDate } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { periodLabel } from "@/modules/attendance/periods";
import {
  getStudentAttendanceHistory,
  getStudentAttendanceSummary,
} from "@/modules/attendance/queries";

export const metadata: Metadata = { title: "My Attendance" };

export default async function StudentAttendancePage() {
  const user = await requireRole("STUDENT");
  const scope = await getStudentScope(user.id);

  if (!scope) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No student profile"
        description="Contact your department office."
      />
    );
  }

  const [summary, history] = await Promise.all([
    getStudentAttendanceSummary(scope.studentId),
    getStudentAttendanceHistory(scope.studentId),
  ]);

  return (
    <>
      <PageHeader title="My Attendance" description="Active academic session" />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Overall"
          value={`${summary.overall.percentage}%`}
          icon={Percent}
        />
        <StatCard
          label="Present"
          value={summary.overall.present}
          icon={CheckCircle2}
        />
        <StatCard
          label="Classes"
          value={summary.overall.total}
          icon={CalendarCheck}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject-wise attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.subjects.length ? (
            summary.subjects.map((s) => (
              <div key={s.subjectId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {s.subjectName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.subjectCode}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.present}/{s.total} · {s.percentage}%
                  </span>
                </div>
                <Progress value={s.percentage} className="h-2" />
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No attendance recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent history</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {history.length ? (
              history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{h.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(h.classDate)} · {periodLabel(h.periodNo)}
                    </p>
                  </div>
                  {h.status === "PRESENT" ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Present
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Absent</Badge>
                  )}
                </li>
              ))
            ) : (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
