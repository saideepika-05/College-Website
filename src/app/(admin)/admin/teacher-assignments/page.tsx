import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listActiveSections } from "@/modules/people/queries";
import {
  adminCreateTeacherAssignment,
  adminRemoveTeacherAssignment,
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

export default async function AdminTeacherAssignmentsPage() {
  const [assignments, teachers, subjects, sections] = await Promise.all([
    listTeacherAssignments(),
    listTeacherOptions(),
    listSubjectOptions(),
    listActiveSections(),
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
            action={adminCreateTeacherAssignment}
          />
        }
      />
      <AssignmentsTable
        assignments={assignments}
        removeAction={adminRemoveTeacherAssignment}
      />
    </>
  );
}
