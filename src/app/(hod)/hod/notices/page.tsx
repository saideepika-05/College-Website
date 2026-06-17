import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  hodCreateNotice,
  hodDeactivateNotice,
} from "@/modules/coursework/actions";
import {
  CreateNoticeButton,
  NoticesFeed,
} from "@/modules/coursework/components/notices-view";
import { listNoticesFor } from "@/modules/coursework/queries";

export const metadata: Metadata = { title: "Notices" };

export default async function HodNoticesPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);
  const notices = await listNoticesFor({ role: "HOD", departmentIds });

  return (
    <>
      <PageHeader
        title="Notices"
        description="Department announcements"
        actions={<CreateNoticeButton action={hodCreateNotice} />}
      />
      <NoticesFeed notices={notices} deactivateAction={hodDeactivateNotice} />
    </>
  );
}
