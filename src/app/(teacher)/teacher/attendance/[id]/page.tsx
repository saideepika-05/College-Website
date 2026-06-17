import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Badge } from "@/components/ui/badge";
import { getTeacherScope } from "@/lib/authz";
import { formatDate } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { periodLabel } from "@/modules/attendance/periods";
import {
  teacherCloseAttendanceSession,
  teacherEditAttendanceRecord,
} from "@/modules/attendance/actions";
import { LiveSession } from "@/modules/attendance/components/live-session";
import { RecordsEditor } from "@/modules/attendance/components/records-editor";
import { getSessionDetail } from "@/modules/attendance/queries";
import { isSessionLive, sessionMatchesPairs } from "@/modules/attendance/service";
import { CheckCircle2, Users, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Attendance Session" };

export default async function TeacherSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);
  if (!scope) notFound();

  const detail = await getSessionDetail(id);
  if (!detail) notFound();
  const { session, records, enrolledCount } = detail;

  const owns =
    session.teacherId === scope.teacherId ||
    sessionMatchesPairs(session, scope.pairs);
  if (!owns) notFound();

  const isLive = isSessionLive(session);

  if (isLive) {
    return (
      <LiveSession
        sessionId={session.id}
        title={`${session.subjectName} · ${session.sectionName}`}
        subtitle={`${periodLabel(session.periodNo)} · ${formatDate(session.classDate)} — scan to mark attendance`}
        enrolledCount={enrolledCount}
        closeAction={teacherCloseAttendanceSession}
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
        actions={
          session.status === "CLOSED" ? (
            <Badge variant="outline">Closed</Badge>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled" value={enrolledCount} icon={Users} />
        <StatCard label="Present" value={present} icon={CheckCircle2} />
        <StatCard label="Absent" value={absent} icon={XCircle} />
      </div>
      <RecordsEditor records={records} editAction={teacherEditAttendanceRecord} />
    </>
  );
}
