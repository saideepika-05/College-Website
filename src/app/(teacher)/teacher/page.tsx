import { ClipboardList, QrCode, Users } from "lucide-react";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import {
  AttendanceTrendChart,
  PercentBarChart,
} from "@/components/kit/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacherScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { getTeacherOverview } from "@/modules/stats/queries";

export default async function TeacherDashboardPage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  if (!scope) {
    return (
      <EmptyState
        icon={Users}
        title="No teacher profile"
        description="Contact your admin."
      />
    );
  }

  const data = await getTeacherOverview(scope.teacherId, user.id);

  return (
    <>
      <PageHeader title="Dashboard" description="Your teaching overview" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Assigned Classes"
          value={data.totals.classes}
          icon={Users}
        />
        <StatCard
          label="Sessions Held"
          value={data.totals.sessionsHeld}
          icon={QrCode}
        />
        <StatCard
          label="Active Assignments"
          value={data.totals.activeAssignments}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Attendance trend (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={data.attendanceTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Class attendance %</CardTitle>
          </CardHeader>
          <CardContent>
            <PercentBarChart data={data.subjectAttendance} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
