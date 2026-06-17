import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  listAcademicSessions,
  listDepartments,
  listSections,
} from "@/modules/academic/queries";
import { CreateSectionButton, SectionsTable } from "./sections-client";

export const metadata: Metadata = { title: "Sections" };

export default async function SectionsPage() {
  const [sections, departments, sessions] = await Promise.all([
    listSections(),
    listDepartments(),
    listAcademicSessions(),
  ]);

  const departmentOptions = departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.name, branchName: d.branchName }));
  const sessionOptions = sessions.map((s) => ({
    id: s.id,
    label: s.label,
    isActive: s.isActive,
  }));

  return (
    <>
      <PageHeader
        title="Sections"
        description="Class sections per department, year and session"
        actions={
          <CreateSectionButton
            departments={departmentOptions}
            sessions={sessionOptions}
          />
        }
      />
      <SectionsTable
        sections={sections}
        departments={departmentOptions}
        sessions={sessionOptions}
      />
    </>
  );
}
