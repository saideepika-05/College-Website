import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  adminCreateNotice,
  adminDeactivateNotice,
} from "@/modules/coursework/actions";
import {
  CreateNoticeButton,
  NoticesFeed,
} from "@/modules/coursework/components/notices-view";
import { listNoticesFor } from "@/modules/coursework/queries";

export const metadata: Metadata = { title: "Notices" };

export default async function AdminNoticesPage() {
  const notices = await listNoticesFor({ role: "ADMIN" });
  return (
    <>
      <PageHeader
        title="Notices"
        description="Institution-wide announcements"
        actions={<CreateNoticeButton action={adminCreateNotice} />}
      />
      <NoticesFeed notices={notices} deactivateAction={adminDeactivateNotice} />
    </>
  );
}
