import {
  ClipboardList,
  GraduationCap,
  Layers,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import {
  AttendanceTrendChart,
  NamedBarChart,
  PercentBarChart,
} from "@/components/kit/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHodDepartmentIds } from "@/lib/authz";
import { YEAR_LABELS } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { getHodOverview } from "@/modules/stats/queries";

export default async function HodDashboardPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);
  const data = await getHodOverview(departmentIds);

  return (
    <>
      <PageHeader title="Dashboard" description="Department overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={data.totals.students}
          icon={GraduationCap}
        />
        <StatCard label="Teachers" value={data.totals.teachers} icon={Users} />
        <StatCard label="Sections" value={data.totals.sections} icon={Layers} />
        <StatCard
          label="Assignments"
          value={data.totals.assignments}
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
            <CardTitle className="text-base">Section performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PercentBarChart data={data.sectionPerformance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students by year</CardTitle>
          </CardHeader>
          <CardContent>
            <NamedBarChart
              data={data.studentsByYear.map((r) => ({
                name: YEAR_LABELS[r.yearLevel],
                value: r.value,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Teacher workload (classes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NamedBarChart data={data.teacherWorkload} color="var(--chart-5)" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
