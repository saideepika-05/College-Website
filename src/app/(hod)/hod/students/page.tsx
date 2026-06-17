import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { inArray } from "drizzle-orm";
import {
  hodCreateStudent,
  hodResetPassword,
  hodSetUserActive,
  hodTransferStudent,
  hodUpdateStudent,
} from "@/modules/people/actions";
import {
  CreateStudentButton,
  StudentsTable,
} from "@/modules/people/components/students-view";
import { listActiveSections, listStudents } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Students" };

const actions = {
  create: hodCreateStudent,
  update: hodUpdateStudent,
  transfer: hodTransferStudent,
  setActive: hodSetUserActive,
  resetPassword: hodResetPassword,
};

export default async function HodStudentsPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [students, sections, departmentRows] = await Promise.all([
    listStudents(departmentIds),
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
        title="Students"
        description="Students in your department"
        actions={
          <CreateStudentButton
            departments={departmentRows}
            sections={sections}
            actions={actions}
          />
        }
      />
      <StudentsTable students={students} sections={sections} actions={actions} profileHrefBase="/hod/students" />
    </>
  );
}
