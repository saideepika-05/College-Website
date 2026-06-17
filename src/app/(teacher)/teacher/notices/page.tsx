import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getTeacherScope } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  teacherCreateNotice,
  teacherDeactivateNotice,
} from "@/modules/coursework/actions";
import {
  CreateNoticeButton,
  NoticesFeed,
} from "@/modules/coursework/components/notices-view";
import { listNoticesFor } from "@/modules/coursework/queries";
import { listActiveSections } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Notices" };

export default async function TeacherNoticesPage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  const [allSections, notices] = await Promise.all([
    listActiveSections(),
    scope
      ? listNoticesFor({
          role: "TEACHER",
          departmentId: scope.departmentId,
          sectionIds: scope.sectionIds,
        })
      : Promise.resolve([]),
  ]);

  const sections = scope
    ? allSections
        .filter((s) => scope.sectionIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name }))
    : [];

  return (
    <>
      <PageHeader
        title="Notices"
        description="Announcements for your sections"
        actions={
          sections.length ? (
            <CreateNoticeButton
              action={teacherCreateNotice}
              sections={sections}
              requireSections
            />
          ) : undefined
        }
      />
      <NoticesFeed
        notices={notices}
        deactivateAction={teacherDeactivateNotice}
      />
    </>
  );
}
