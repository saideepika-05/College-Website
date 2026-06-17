import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, departments, user } from "@/db/schema";

export type AuditLogRow = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  departmentName: string | null;
  createdAt: Date;
};

/** Audit trail, newest first. HODs pass their departmentIds (SRS §25). */
export async function listAuditLogs(opts: {
  departmentIds?: string[];
  limit?: number;
}): Promise<AuditLogRow[]> {
  return db
    .select({
      id: auditLogs.id,
      actorName: user.name,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      before: auditLogs.before,
      after: auditLogs.after,
      departmentName: departments.name,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.actorId, user.id))
    .leftJoin(departments, eq(auditLogs.departmentId, departments.id))
    .where(
      opts.departmentIds
        ? inArray(auditLogs.departmentId, opts.departmentIds)
        : undefined,
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(opts.limit ?? 200);
}
