import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listDepartments } from "@/modules/academic/queries";
import { listActiveSections } from "@/modules/people/queries";
import { ReportsView } from "@/modules/reports/components/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const [sections, departments] = await Promise.all([
    listActiveSections(),
    listDepartments(),
  ]);

  const departmentOptions = departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: `${d.name} — ${d.branchName}` }));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export attendance, rosters and assignments as CSV, Excel or PDF"
      />
      <ReportsView sections={sections} departments={departmentOptions} />
    </>
  );
}
