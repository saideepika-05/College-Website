import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  adminCreateTeacher,
  adminResetPassword,
  adminSetUserActive,
  adminUpdateTeacher,
} from "@/modules/people/actions";
import {
  CreateTeacherButton,
  TeachersTable,
} from "@/modules/people/components/teachers-view";
import { listDepartments } from "@/modules/academic/queries";
import { listTeachers } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Teachers" };

const actions = {
  create: adminCreateTeacher,
  update: adminUpdateTeacher,
  setActive: adminSetUserActive,
  resetPassword: adminResetPassword,
};

export default async function AdminTeachersPage() {
  const [teachers, departments] = await Promise.all([
    listTeachers(),
    listDepartments(),
  ]);

  const departmentOptions = departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: `${d.name} — ${d.branchName}` }));

  return (
    <>
      <PageHeader
        title="Teachers"
        description="All teachers across the institution"
        actions={
          <CreateTeacherButton
            departments={departmentOptions}
            actions={actions}
          />
        }
      />
      <TeachersTable teachers={teachers} actions={actions} />
    </>
  );
}
