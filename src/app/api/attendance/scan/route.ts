import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { markByScan } from "@/modules/attendance/service";
import { parseQrPayload } from "@/modules/attendance/token";

const bodySchema = z.object({ payload: z.string().min(1).max(1000) });

/**
 * Best-effort per-instance rate limiter (serverless instances are
 * short-lived; the DB unique constraint is the real protection — this
 * just blunts hammering).
 */
const hits = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "You must be signed in." },
      { status: 401 },
    );
  }
  const u = session.user as unknown as { id: string; role: string; isActive: boolean };
  if (u.role !== "STUDENT") {
    return NextResponse.json(
      { ok: false, reason: "Only students can mark attendance." },
      { status: 403 },
    );
  }
  if (rateLimited(u.id)) {
    return NextResponse.json(
      { ok: false, reason: "Too many attempts — wait a moment." },
      { status: 429 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "Invalid request." },
      { status: 400 },
    );
  }

  const qr = parseQrPayload(parsed.data.payload);
  if (!qr) {
    return NextResponse.json(
      { ok: false, reason: "That QR code is not an attendance code." },
      { status: 400 },
    );
  }

  const result = await markByScan(u.id, qr.sessionId, qr.token);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
