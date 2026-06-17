import "server-only";

import { auditLogs } from "@/db/schema";
import type { Database, Transaction } from "@/db";

export type AuditEntry = {
  /** Null for system-initiated actions (e.g. cron auto-close). */
  actorId: string | null;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "DEACTIVATE"
    | "ACTIVATE"
    | "PASSWORD_RESET"
    | "PROMOTE"
    | "TRANSFER"
    | "ATTENDANCE_GENERATE"
    | "ATTENDANCE_MARK"
    | "ATTENDANCE_EDIT"
    | "ATTENDANCE_CLOSE";
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  /** Set whenever the entity belongs to a department — enables HOD-scoped audit views. */
  departmentId?: string | null;
};

/**
 * Writes an audit row. ALWAYS call inside the same transaction as the
 * mutation it describes, so the change and its trail commit atomically.
 */
export async function audit(
  tx: Transaction | Database,
  entry: AuditEntry,
): Promise<void> {
  await tx.insert(auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    departmentId: entry.departmentId ?? null,
  });
}
