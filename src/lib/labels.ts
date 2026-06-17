export const YEAR_LEVELS = [
  "YEAR_1",
  "YEAR_2",
  "YEAR_3",
  "YEAR_4",
] as const;

export type YearLevel = (typeof YEAR_LEVELS)[number];

export const YEAR_LABELS: Record<YearLevel, string> = {
  YEAR_1: "1st Year",
  YEAR_2: "2nd Year",
  YEAR_3: "3rd Year",
  YEAR_4: "4th Year",
};

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
};

/** JS Date.getDay() → our enum (Sunday has no classes). */
export const JS_DAY_TO_ENUM: Record<number, DayOfWeek | null> = {
  0: null,
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime12h(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const am = h < 12;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}
