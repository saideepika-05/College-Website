import { CheckCircle2, Users, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { periodLabel } from "@/modules/attendance/periods";
import {
  adminCloseAttendanceSession,
  adminEditAttendanceRecord,
} from "@/modules/attendance/actions";
import { LiveSession } from "@/modules/attendance/components/live-session";
import { RecordsEditor } from "@/modules/attendance/components/records-editor";
import { getSessionDetail } from "@/modules/attendance/queries";
import { isSessionLive } from "@/modules/attendance/service";

export const metadata: Metadata = { title: "Attendance Session" };

export default async function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("ADMIN");

  const detail = await getSessionDetail(id);
  if (!detail) notFound();
  const { session, records, enrolledCount } = detail;

  const isLive = isSessionLive(session);

  if (isLive) {
    return (
      <LiveSession
        sessionId={session.id}
        title={`${session.subjectName} · ${session.sectionName}`}
        subtitle={`${periodLabel(session.periodNo)} · ${formatDate(session.classDate)} — scan to mark attendance`}
        enrolledCount={enrolledCount}
        closeAction={adminCloseAttendanceSession}
      />
    );
  }

  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;

  return (
    <>
      <PageHeader
        title={`${session.subjectName} · ${session.sectionName}`}
        description={`${periodLabel(session.periodNo)} · ${formatDate(session.classDate)} · taken by ${session.teacherName}`}
        actions={<Badge variant="outline">Closed</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled" value={enrolledCount} icon={Users} />
        <StatCard label="Present" value={present} icon={CheckCircle2} />
        <StatCard label="Absent" value={absent} icon={XCircle} />
      </div>
      <RecordsEditor records={records} editAction={adminEditAttendanceRecord} />
    </>
  );
}
