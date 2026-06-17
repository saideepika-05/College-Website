import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceRecords, students, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  getHodDepartmentIds,
  getTeacherScope,
} from "@/lib/authz";
import { getSessionRow, sessionMatchesPairs } from "@/modules/attendance/service";
import { departmentOfSection } from "@/modules/teaching/service";
import { issueToken, qrPayload } from "@/modules/attendance/token";

/**
 * Live data for the projector screen: the current rotating QR payload,
 * seconds to rotation, and who has scanned so far. Polled by the client.
 * Only the owning teacher, the department's HOD, or an admin may read it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const u = authSession.user as unknown as { id: string; role: string };

  const session = await getSessionRow(id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let allowed = false;
  if (u.role === "ADMIN") {
    allowed = true;
  } else if (u.role === "TEACHER") {
    const scope = await getTeacherScope(u.id);
    allowed =
      !!scope &&
      (session.teacherId === scope.teacherId ||
        sessionMatchesPairs(session, scope.pairs));
  } else if (u.role === "HOD") {
    const departmentIds = await getHodDepartmentIds(u.id);
    const dept = await departmentOfSection(session.sectionId);
    allowed = !!dept && departmentIds.includes(dept);
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const present = await db
    .select({
      rollNumber: students.rollNumber,
      name: user.name,
      markedAt: attendanceRecords.markedAt,
    })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(user, eq(students.userId, user.id))
    .where(
      and(
        eq(attendanceRecords.attendanceSessionId, id),
        eq(attendanceRecords.status, "PRESENT"),
      ),
    )
    .orderBy(attendanceRecords.markedAt);

  const [totalRow] = await db
    .select({ c: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.attendanceSessionId, id));

  const isOpen =
    session.status === "OPEN" && session.expiresAt.getTime() > Date.now();

  let qr: { payload: string; expiresInSeconds: number } | null = null;
  if (isOpen) {
    const { token, expiresInSeconds } = issueToken(id, session.tokenSecret);
    qr = { payload: qrPayload(id, token), expiresInSeconds };
  }

  return NextResponse.json({
    status: session.status,
    isOpen,
    sessionExpiresAt: session.expiresAt.toISOString(),
    qr,
    present,
    presentCount: present.length,
    markedCount: totalRow?.c ?? 0,
  });
}
