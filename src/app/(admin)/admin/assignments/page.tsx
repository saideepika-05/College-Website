import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  adminCreateAssignment,
  adminDeleteAssignment,
  adminUpdateAssignment,
} from "@/modules/coursework/actions";
import {
  AssignmentsTable,
  CreateAssignmentButton,
} from "@/modules/coursework/components/assignments-view";
import { listAssignments } from "@/modules/coursework/queries";
import { listActiveSections } from "@/modules/people/queries";
import { listSubjectOptions } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Assignments" };

export default async function AdminAssignmentsPage() {
  const [assignments, subjects, sections] = await Promise.all([
    listAssignments({}),
    listSubjectOptions(),
    listActiveSections(),
  ]);

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Homework assignments across the institution"
        actions={
          <CreateAssignmentButton
            subjects={subjects}
            sections={sections}
            action={adminCreateAssignment}
          />
        }
      />
      <AssignmentsTable
        assignments={assignments}
        updateAction={adminUpdateAssignment}
        deleteAction={adminDeleteAssignment}
      />
    </>
  );
}
