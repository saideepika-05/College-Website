import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  adminCreateStudent,
  adminResetPassword,
  adminSetUserActive,
  adminTransferStudent,
  adminUpdateStudent,
} from "@/modules/people/actions";
import {
  CreateStudentButton,
  StudentsTable,
} from "@/modules/people/components/students-view";
import { listDepartments } from "@/modules/academic/queries";
import { listActiveSections, listStudents } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Students" };

const actions = {
  create: adminCreateStudent,
  update: adminUpdateStudent,
  transfer: adminTransferStudent,
  setActive: adminSetUserActive,
  resetPassword: adminResetPassword,
};

export default async function AdminStudentsPage() {
  const [students, sections, departments] = await Promise.all([
    listStudents(),
    listActiveSections(),
    listDepartments(),
  ]);

  const departmentOptions = departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: `${d.name} — ${d.branchName}` }));

  return (
    <>
      <PageHeader
        title="Students"
        description="All students across the institution"
        actions={
          <CreateStudentButton
            departments={departmentOptions}
            sections={sections}
            actions={actions}
          />
        }
      />
      <StudentsTable students={students} sections={sections} actions={actions} profileHrefBase="/admin/students" />
    </>
  );
}
