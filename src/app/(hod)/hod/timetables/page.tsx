import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { listActiveSections } from "@/modules/people/queries";
import {
  hodAddTimetableEntry,
  hodRemoveTimetableEntry,
} from "@/modules/teaching/actions";
import { TimetableEditor } from "@/modules/teaching/components/timetable-editor";
import {
  getSectionTimetable,
  listTeacherAssignments,
  type TimetableCell,
} from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "Timetables" };

export default async function HodTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);
  const { sectionId: requestedSectionId } = await searchParams;

  const sections = await listActiveSections(departmentIds);

  // Only honor the sectionId if it belongs to a section in this HOD's scope.
  const sectionId = sections.some((s) => s.id === requestedSectionId)
    ? requestedSectionId
    : undefined;

  let cells: TimetableCell[] = [];
  let assignments: Awaited<ReturnType<typeof listTeacherAssignments>> = [];
  if (sectionId) {
    [cells, assignments] = await Promise.all([
      getSectionTimetable(sectionId),
      listTeacherAssignments(departmentIds),
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
        addAction={hodAddTimetableEntry}
        removeAction={hodRemoveTimetableEntry}
      />
    </>
  );
}
