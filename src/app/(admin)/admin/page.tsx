import {
  Building2,
  GraduationCap,
  School,
  UserCog,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import {
  AttendanceTrendChart,
  NamedBarChart,
} from "@/components/kit/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview } from "@/modules/stats/queries";

export default async function AdminDashboardPage() {
  const data = await getAdminOverview();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Institution overview${data.activeSessionLabel ? ` · ${data.activeSessionLabel}` : ""}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Students"
          value={data.totals.students}
          icon={GraduationCap}
        />
        <StatCard label="Total Teachers" value={data.totals.teachers} icon={Users} />
        <StatCard label="Total HODs" value={data.totals.hods} icon={UserCog} />
        <StatCard
          label="Departments"
          value={data.totals.departments}
          icon={School}
        />
        <StatCard
          label="Branches"
          value={data.totals.branches}
          icon={Building2}
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
            <CardTitle className="text-base">Students per branch</CardTitle>
          </CardHeader>
          <CardContent>
            <NamedBarChart data={data.studentsPerBranch} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students per department</CardTitle>
          </CardHeader>
          <CardContent>
            <NamedBarChart data={data.studentsPerDepartment} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teachers per department</CardTitle>
          </CardHeader>
          <CardContent>
            <NamedBarChart
              data={data.teachersPerDepartment}
              color="var(--chart-4)"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
