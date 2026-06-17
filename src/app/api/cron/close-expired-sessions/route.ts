import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { closeExpiredSessions } from "@/modules/attendance/service";

/**
 * Cron safety net: closes attendance sessions whose expiry passed
 * without the teacher pressing "End session", backfilling absentees.
 * Scheduled every 15 min via .github/workflows/close-expired-sessions.yml
 * (Vercel Hobby caps cron at once/day). Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const closed = await closeExpiredSessions();
  return NextResponse.json({ closed });
}
