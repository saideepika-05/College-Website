import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { getTeacherScope } from "@/lib/authz";
import { JS_DAY_TO_ENUM } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { TimetableGrid } from "@/modules/teaching/components/timetable-grid";
import { getTeacherTimetable } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "My Timetable" };

export default async function TeacherTimetablePage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  if (!scope || scope.pairs.length === 0) {
    return (
      <>
        <PageHeader title="My Timetable" />
        <EmptyState
          icon={CalendarDays}
          title="No classes assigned yet"
          description="Your weekly timetable will appear here once you are assigned subjects and sections."
        />
      </>
    );
  }

  const cells = await getTeacherTimetable(scope.teacherId);
  const highlightDay = JS_DAY_TO_ENUM[new Date().getDay()] ?? undefined;

  return (
    <>
      <PageHeader
        title="My Timetable"
        description="Your weekly teaching schedule"
      />
      <TimetableGrid cells={cells} mode="teacher" highlightDay={highlightDay} />
    </>
  );
}
