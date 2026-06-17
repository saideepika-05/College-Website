import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import { PageHeader } from "@/components/kit/page-header";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  hodCreateTeacher,
  hodResetPassword,
  hodSetUserActive,
  hodUpdateTeacher,
} from "@/modules/people/actions";
import {
  CreateTeacherButton,
  TeachersTable,
} from "@/modules/people/components/teachers-view";
import { listTeachers } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Teachers" };

const actions = {
  create: hodCreateTeacher,
  update: hodUpdateTeacher,
  setActive: hodSetUserActive,
  resetPassword: hodResetPassword,
};

export default async function HodTeachersPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [teachers, departmentRows] = await Promise.all([
    listTeachers(departmentIds),
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
        title="Teachers"
        description="Teachers in your department"
        actions={
          <CreateTeacherButton departments={departmentRows} actions={actions} />
        }
      />
      <TeachersTable teachers={teachers} actions={actions} />
    </>
  );
}
