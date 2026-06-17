import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { listActiveSections } from "@/modules/people/queries";
import {
  hodCreateTeacherAssignment,
  hodRemoveTeacherAssignment,
} from "@/modules/teaching/actions";
import {
  AssignmentsTable,
  CreateAssignmentButton,
} from "@/modules/teaching/components/assignments-view";
import {
  listSubjectOptions,
  listTeacherAssignments,
  listTeacherOptions,
} from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Subject Assignments" };

export default async function HodTeacherAssignmentsPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [assignments, teachers, subjects, sections] = await Promise.all([
    listTeacherAssignments(departmentIds),
    listTeacherOptions(departmentIds),
    listSubjectOptions(departmentIds),
    listActiveSections(departmentIds),
  ]);

  return (
    <>
      <PageHeader
        title="Subject Assignments"
        description="Which teacher teaches which subject for which section"
        actions={
          <CreateAssignmentButton
            teachers={teachers}
            subjects={subjects}
            sections={sections}
            action={hodCreateTeacherAssignment}
          />
        }
      />
      <AssignmentsTable
        assignments={assignments}
        removeAction={hodRemoveTeacherAssignment}
      />
    </>
  );
}
