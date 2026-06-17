import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

/**
 * Stateless rotating QR tokens.
 *
 * Each attendance session gets a random per-session secret stored in the DB.
 * The displayed QR encodes HMAC(qrSecret + sessionSecret, sessionId:window)
 * where window = floor(unixSeconds / 30). Rotation therefore needs no DB
 * writes, a screenshot dies within ≤30s, and a leaked token is useless for
 * any other session.
 */

import { QR_WINDOW_SECONDS } from "./token-constants";

export { QR_WINDOW_SECONDS };

export function newSessionSecret(): string {
  return randomBytes(32).toString("hex");
}

function hmacFor(
  sessionId: string,
  sessionSecret: string,
  window: number,
): string {
  return createHmac("sha256", `${env.ATTENDANCE_QR_SECRET}.${sessionSecret}`)
    .update(`${sessionId}:${window}`)
    .digest("hex")
    .slice(0, 32);
}

export function currentWindow(now = Date.now()): number {
  return Math.floor(now / 1000 / QR_WINDOW_SECONDS);
}

/** Token currently valid for a session + seconds until it rotates. */
export function issueToken(
  sessionId: string,
  sessionSecret: string,
): { token: string; expiresInSeconds: number } {
  const nowMs = Date.now();
  const window = currentWindow(nowMs);
  const windowEndsMs = (window + 1) * QR_WINDOW_SECONDS * 1000;
  return {
    token: hmacFor(sessionId, sessionSecret, window),
    expiresInSeconds: Math.max(1, Math.ceil((windowEndsMs - nowMs) / 1000)),
  };
}

/**
 * Validates a scanned token. Accepts the current window and the previous
 * one (grace for clock skew + the instant of rotation).
 */
export function verifyToken(
  sessionId: string,
  sessionSecret: string,
  token: string,
): boolean {
  const window = currentWindow();
  for (const w of [window, window - 1]) {
    const expected = hmacFor(sessionId, sessionSecret, w);
    if (
      token.length === expected.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      return true;
    }
  }
  return false;
}

/** Payload encoded into the QR image. */
export function qrPayload(sessionId: string, token: string): string {
  return JSON.stringify({ v: 1, sid: sessionId, tok: token });
}

export function parseQrPayload(
  raw: string,
): { sessionId: string; token: string } | null {
  try {
    const parsed = JSON.parse(raw) as { v?: number; sid?: string; tok?: string };
    if (parsed.v !== 1 || !parsed.sid || !parsed.tok) return null;
    return { sessionId: parsed.sid, token: parsed.tok };
  } catch {
    return null;
  }
}
