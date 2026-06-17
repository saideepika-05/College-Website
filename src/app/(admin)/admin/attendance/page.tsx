import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { SessionsTable } from "@/modules/attendance/components/sessions-table";
import { listAttendanceSessions } from "@/modules/attendance/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminAttendancePage() {
  const sessions = await listAttendanceSessions({ limit: 100 });
  return (
    <>
      <PageHeader
        title="Attendance"
        description="All attendance sessions across the institution"
      />
      <SessionsTable sessions={sessions} hrefBase="/admin/attendance" />
    </>
  );
}
