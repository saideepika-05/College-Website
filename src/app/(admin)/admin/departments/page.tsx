import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listBranches, listDepartments } from "@/modules/academic/queries";
import { CreateDepartmentButton, DepartmentsTable } from "./departments-client";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const [departments, allBranches] = await Promise.all([
    listDepartments(),
    listBranches(),
  ]);
  const branchOptions = allBranches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHeader
        title="Departments"
        description="Academic departments across branches"
        actions={<CreateDepartmentButton branches={branchOptions} />}
      />
      <DepartmentsTable departments={departments} branches={branchOptions} />
    </>
  );
}
