import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { AuditTable } from "@/modules/audit/components/audit-table";
import { listAuditLogs } from "@/modules/audit/queries";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditLogsPage() {
  const logs = await listAuditLogs({ limit: 300 });
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Every sensitive change, who made it, and what changed"
      />
      <AuditTable logs={logs} />
    </>
  );
}
