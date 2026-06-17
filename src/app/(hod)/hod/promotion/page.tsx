import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import {
  hodGraduateStudents,
  hodPromoteStudents,
} from "@/modules/promotion/actions";
import { PromotionView } from "@/modules/promotion/components/promotion-view";
import {
  listSectionRoster,
  listSectionsAcrossSessions,
} from "@/modules/promotion/service";

export const metadata: Metadata = { title: "Promotion" };

export default async function HodPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);
  const sections = await listSectionsAcrossSessions(departmentIds);
  // Only sections inside the HOD's scope are valid sources.
  const validFrom = from && sections.some((s) => s.id === from) ? from : null;
  const roster = validFrom ? await listSectionRoster(validFrom) : [];

  return (
    <>
      <PageHeader
        title="Student Promotion"
        description="Promote your department's sections into the next academic year"
      />
      <PromotionView
        sections={sections}
        roster={roster}
        fromSectionId={validFrom}
        promoteAction={hodPromoteStudents}
        graduateAction={hodGraduateStudents}
      />
    </>
  );
}
