import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listDepartments } from "@/modules/academic/queries";
import { listHods } from "@/modules/people/queries";
import { CreateHodButton, HodsTable } from "./hods-client";

export const metadata: Metadata = { title: "HODs" };

export default async function AdminHodsPage() {
  const [hods, departments] = await Promise.all([
    listHods(),
    listDepartments(),
  ]);

  const assigned = new Set(hods.map((h) => h.departmentId));
  const departmentOptions = departments
    .filter((d) => d.isActive && !assigned.has(d.id))
    .map((d) => ({ id: d.id, name: `${d.name} — ${d.branchName}` }));

  return (
    <>
      <PageHeader
        title="Heads of Department"
        description="One HOD per department"
        actions={<CreateHodButton departments={departmentOptions} />}
      />
      <HodsTable hods={hods} />
    </>
  );
}
