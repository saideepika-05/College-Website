import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getTeacherScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  teacherCreateAssignment,
  teacherDeleteAssignment,
  teacherUpdateAssignment,
} from "@/modules/coursework/actions";
import {
  AssignmentsTable,
  CreateAssignmentButton,
} from "@/modules/coursework/components/assignments-view";
import { listAssignments } from "@/modules/coursework/queries";
import { listActiveSections } from "@/modules/people/queries";
import { listSubjectOptions } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Assignments" };

export default async function TeacherAssignmentsPage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  const [assignments, allSubjects, allSections] = await Promise.all([
    listAssignments({ createdByUserId: user.id }),
    listSubjectOptions(),
    listActiveSections(),
  ]);

  const subjects = scope
    ? allSubjects.filter((s) => scope.subjectIds.includes(s.id))
    : [];
  const sections = scope
    ? allSections.filter((s) => scope.sectionIds.includes(s.id))
    : [];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Assignments you have published for your classes"
        actions={
          subjects.length ? (
            <CreateAssignmentButton
              subjects={subjects}
              sections={sections}
              action={teacherCreateAssignment}
            />
          ) : undefined
        }
      />
      <AssignmentsTable
        assignments={assignments}
        updateAction={teacherUpdateAssignment}
        deleteAction={teacherDeleteAssignment}
      />
    </>
  );
}
