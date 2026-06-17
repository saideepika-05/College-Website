import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { getHodDepartmentIds } from "@/lib/authz";
import { requireRole } from "@/lib/session";
import { AuditTable } from "@/modules/audit/components/audit-table";
import { listAuditLogs } from "@/modules/audit/queries";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function HodAuditLogsPage() {
  const user = await requireRole("HOD");
  const departmentIds = await getHodDepartmentIds(user.id);
  const logs = await listAuditLogs({ departmentIds, limit: 300 });
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Changes within your department"
      />
      <AuditTable logs={logs} />
    </>
  );
}
