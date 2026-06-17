import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import {
  adminGraduateStudents,
  adminPromoteStudents,
} from "@/modules/promotion/actions";
import { PromotionView } from "@/modules/promotion/components/promotion-view";
import {
  listSectionRoster,
  listSectionsAcrossSessions,
} from "@/modules/promotion/service";

export const metadata: Metadata = { title: "Promotion" };

export default async function AdminPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const sections = await listSectionsAcrossSessions();
  const validFrom = from && sections.some((s) => s.id === from) ? from : null;
  const roster = validFrom ? await listSectionRoster(validFrom) : [];

  return (
    <>
      <PageHeader
        title="Student Promotion"
        description="Promote sections into the next academic year, or mark final-year students as completed"
      />
      <PromotionView
        sections={sections}
        roster={roster}
        fromSectionId={validFrom}
        promoteAction={adminPromoteStudents}
        graduateAction={adminGraduateStudents}
      />
    </>
  );
}
