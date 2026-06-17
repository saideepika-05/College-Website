import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { getStudentScope } from "@/lib/authz";
import { JS_DAY_TO_ENUM } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { TimetableGrid } from "@/modules/teaching/components/timetable-grid";
import { getSectionTimetable } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Timetable" };

export default async function StudentTimetablePage() {
  const user = await requireRole("STUDENT");
  const scope = await getStudentScope(user.id);

  if (!scope?.currentEnrollment) {
    return (
      <>
        <PageHeader title="Timetable" />
        <EmptyState
          icon={CalendarDays}
          title="You are not enrolled in the active session"
          description="Your weekly timetable will appear here once you are enrolled in a section."
        />
      </>
    );
  }

  const cells = await getSectionTimetable(scope.currentEnrollment.sectionId);
  const highlightDay = JS_DAY_TO_ENUM[new Date().getDay()] ?? undefined;
  const sectionName = cells[0]?.sectionName;

  return (
    <>
      <PageHeader
        title="Timetable"
        description={sectionName ? `Weekly schedule for ${sectionName}` : undefined}
      />
      <TimetableGrid cells={cells} mode="section" highlightDay={highlightDay} />
    </>
  );
}
