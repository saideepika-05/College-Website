import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listBranches } from "@/modules/academic/queries";
import { BranchesTable, CreateBranchButton } from "./branches-client";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesPage() {
  const branches = await listBranches();
  return (
    <>
      <PageHeader
        title="Branches"
        description="Campuses of the institution"
        actions={<CreateBranchButton />}
      />
      <BranchesTable branches={branches} />
    </>
  );
}
