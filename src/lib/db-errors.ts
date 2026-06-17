/**
 * Drizzle wraps driver errors (DrizzleQueryError with the pg error as
 * `cause`), so Postgres error codes must be read through the cause chain.
 */
type PgErrorShape = { code?: string; constraint?: string };

export function pgError(e: unknown, depth = 0): PgErrorShape | null {
  if (depth > 5 || typeof e !== "object" || e === null) return null;
  const candidate = e as PgErrorShape & { cause?: unknown };
  if (typeof candidate.code === "string") return candidate;
  if ("cause" in candidate) return pgError(candidate.cause, depth + 1);
  return null;
}

export function isUniqueViolation(e: unknown): boolean {
  return pgError(e)?.code === "23505";
}

export function violatedConstraint(e: unknown): string {
  return pgError(e)?.constraint ?? "";
}
