import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getStudentScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { NoticesFeed } from "@/modules/coursework/components/notices-view";
import { listNoticesFor } from "@/modules/coursework/queries";

export const metadata: Metadata = { title: "Notices" };

export default async function StudentNoticesPage() {
  const user = await requireRole("STUDENT");
  const scope = await getStudentScope(user.id);

  const notices = scope
    ? await listNoticesFor({
        role: "STUDENT",
        departmentId: scope.departmentId,
        sectionId: scope.currentEnrollment?.sectionId ?? null,
      })
    : [];

  return (
    <>
      <PageHeader title="Notices" description="Announcements relevant to you" />
      <NoticesFeed notices={notices} />
    </>
  );
}
