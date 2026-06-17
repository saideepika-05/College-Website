import { inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { listActiveSections } from "@/modules/people/queries";
import { ReportsView } from "@/modules/reports/components/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function HodReportsPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [sections, departmentRows] = await Promise.all([
    listActiveSections(departmentIds),
    departmentIds.length
      ? db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(inArray(departments.id, departmentIds))
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export attendance, rosters and assignments as CSV, Excel or PDF"
      />
      <ReportsView sections={sections} departments={departmentRows} />
    </>
  );
}
