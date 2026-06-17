import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { getStudentScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { AssignmentsFeed } from "@/modules/coursework/components/assignments-view";
import { listAssignments } from "@/modules/coursework/queries";

export const metadata: Metadata = { title: "Assignments" };

export default async function StudentAssignmentsPage() {
  const user = await requireRole("STUDENT");
  const scope = await getStudentScope(user.id);

  if (!scope?.currentEnrollment) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Not enrolled"
        description="You are not enrolled in the active session — contact your department office."
      />
    );
  }

  const assignments = await listAssignments({
    sectionId: scope.currentEnrollment.sectionId,
  });

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Assignments for your section"
      />
      <AssignmentsFeed assignments={assignments} />
    </>
  );
}
