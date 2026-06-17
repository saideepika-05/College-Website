import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  hodCreateAssignment,
  hodDeleteAssignment,
  hodUpdateAssignment,
} from "@/modules/coursework/actions";
import {
  AssignmentsTable,
  CreateAssignmentButton,
} from "@/modules/coursework/components/assignments-view";
import { listAssignments } from "@/modules/coursework/queries";
import { listActiveSections } from "@/modules/people/queries";
import { listSubjectOptions } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Assignments" };

export default async function HodAssignmentsPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);

  const [assignments, subjects, sections] = await Promise.all([
    listAssignments({ departmentIds }),
    listSubjectOptions(departmentIds),
    listActiveSections(departmentIds),
  ]);

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Homework assignments in your department"
        actions={
          <CreateAssignmentButton
            subjects={subjects}
            sections={sections}
            action={hodCreateAssignment}
          />
        }
      />
      <AssignmentsTable
        assignments={assignments}
        updateAction={hodUpdateAssignment}
        deleteAction={hodDeleteAssignment}
      />
    </>
  );
}
