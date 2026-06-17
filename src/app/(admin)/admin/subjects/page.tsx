import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listDepartments, listSubjects } from "@/modules/academic/queries";
import { CreateSubjectButton, SubjectsTable } from "./subjects-client";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const [subjects, allDepartments] = await Promise.all([
    listSubjects(),
    listDepartments(),
  ]);
  const departmentOptions = allDepartments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.name, branchName: d.branchName }));

  return (
    <>
      <PageHeader
        title="Subjects"
        description="Subjects by department and year"
        actions={<CreateSubjectButton departments={departmentOptions} />}
      />
      <SubjectsTable subjects={subjects} departments={departmentOptions} />
    </>
  );
}
