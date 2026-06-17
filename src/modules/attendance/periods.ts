/**
 * Fixed institutional bell schedule. Attendance is taken once per period
 * (hourly), so every attendance session is pinned to one of these slots.
 *
 * Client-safe: imported by both the server (to derive/enforce the current
 * period) and the browser (to display it). No "server-only" here.
 */

/** All period clocks are interpreted in this timezone, regardless of where
 * the server or the user's browser actually runs. */
export const INSTITUTION_TIMEZONE = "Asia/Kolkata";

export type Period = {
  /** 1-based period number, stored on the attendance session. */
  no: number;
  /** Human label, e.g. "9:40 – 10:40". */
  label: string;
  /** Start, minutes since local midnight (inclusive). */
  startMin: number;
  /** End, minutes since local midnight (exclusive). */
  endMin: number;
};

const at = (h: number, m: number) => h * 60 + m;

export const PERIODS: readonly Period[] = [
  { no: 1, label: "9:40 – 10:40", startMin: at(9, 40), endMin: at(10, 40) },
  { no: 2, label: "10:40 – 11:40", startMin: at(10, 40), endMin: at(11, 40) },
  { no: 3, label: "11:40 – 12:40", startMin: at(11, 40), endMin: at(12, 40) },
  { no: 4, label: "1:10 – 2:10", startMin: at(13, 10), endMin: at(14, 10) },
  { no: 5, label: "2:10 – 3:10", startMin: at(14, 10), endMin: at(15, 10) },
  { no: 6, label: "3:10 – 4:10", startMin: at(15, 10), endMin: at(16, 10) },
] as const;

export function getPeriod(no: number): Period | null {
  return PERIODS.find((p) => p.no === no) ?? null;
}

/** "P3 · 11:40 – 12:40" — falls back gracefully for unknown numbers. */
export function periodLabel(no: number): string {
  const p = getPeriod(no);
  return p ? `P${p.no} · ${p.label}` : `P${no}`;
}

/** Minutes since midnight for `date` in the institution timezone. */
export function minutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INSTITUTION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // Intl can emit "24" for midnight under hour12:false — normalize.
  return (hour % 24) * 60 + minute;
}

/** The period currently in progress, or null if outside all slots. */
export function getCurrentPeriod(now: Date = new Date()): Period | null {
  const mins = minutesOfDay(now);
  return PERIODS.find((p) => mins >= p.startMin && mins < p.endMin) ?? null;
}

/** Whole minutes remaining until the current period ends (0 if none). */
export function minutesUntilPeriodEnd(now: Date = new Date()): number {
  const period = getCurrentPeriod(now);
  if (!period) return 0;
  return Math.max(0, period.endMin - minutesOfDay(now));
}
