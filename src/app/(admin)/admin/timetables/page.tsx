import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import type { TimetableCell } from "@/modules/teaching/queries";
import { listActiveSections } from "@/modules/people/queries";
import {
  adminAddTimetableEntry,
  adminRemoveTimetableEntry,
} from "@/modules/teaching/actions";
import { TimetableEditor } from "@/modules/teaching/components/timetable-editor";
import {
  getSectionTimetable,
  listTeacherAssignments,
} from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Timetables" };

export default async function AdminTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const { sectionId } = await searchParams;
  const sections = await listActiveSections();

  let cells: TimetableCell[] = [];
  let assignments: Awaited<ReturnType<typeof listTeacherAssignments>> = [];
  if (sectionId) {
    [cells, assignments] = await Promise.all([
      getSectionTimetable(sectionId),
      listTeacherAssignments(),
    ]);
  }

  return (
    <>
      <PageHeader
        title="Timetables"
        description="Build weekly timetables per section"
      />
      <TimetableEditor
        sections={sections}
        selectedSectionId={sectionId}
        cells={cells}
        assignments={assignments}
        addAction={adminAddTimetableEntry}
        removeAction={adminRemoveTimetableEntry}
      />
    </>
  );
}
