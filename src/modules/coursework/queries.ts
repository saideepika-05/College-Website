import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  assignmentTargets,
  notices,
  noticeTargets,
  sections,
  subjects,
  user,
} from "@/db/schema";
import { getActiveAcademicSession } from "@/lib/authz";

/**
 * Coursework list queries (active academic session only). Callers pass a
 * scope: `departmentIds` (HOD), `createdByUserId` (teacher manage view) or
 * `sectionId` (student feed). Omit all for admin-wide listings.
 */

export type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assignedDate: string;
  dueDate: string;
  createdByName: string;
  targetSections: string[];
  targetSectionIds: string[];
};

export async function listAssignments(opts: {
  departmentIds?: string[];
  createdByUserId?: string;
  sectionId?: string;
}): Promise<AssignmentRow[]> {
  const active = await getActiveAcademicSession();
  if (!active) return [];
  if (opts.departmentIds && opts.departmentIds.length === 0) return [];

  // Student view: resolve which assignments target their section first.
  let idsForSection: string[] | null = null;
  if (opts.sectionId) {
    const targetRows = await db
      .select({ assignmentId: assignmentTargets.assignmentId })
      .from(assignmentTargets)
      .where(eq(assignmentTargets.sectionId, opts.sectionId));
    idsForSection = targetRows.map((r) => r.assignmentId);
    if (idsForSection.length === 0) return [];
  }

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      subjectId: assignments.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      assignedDate: assignments.assignedDate,
      dueDate: assignments.dueDate,
      createdByName: user.name,
    })
    .from(assignments)
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(user, eq(assignments.createdById, user.id))
    .where(
      and(
        eq(assignments.academicSessionId, active.id),
        opts.departmentIds
          ? inArray(subjects.departmentId, opts.departmentIds)
          : undefined,
        opts.createdByUserId
          ? eq(assignments.createdById, opts.createdByUserId)
          : undefined,
        idsForSection ? inArray(assignments.id, idsForSection) : undefined,
      ),
    )
    .orderBy(desc(assignments.dueDate), desc(assignments.createdAt));

  if (rows.length === 0) return [];

  const targets = await db
    .select({
      assignmentId: assignmentTargets.assignmentId,
      sectionId: assignmentTargets.sectionId,
      sectionName: sections.name,
    })
    .from(assignmentTargets)
    .innerJoin(sections, eq(assignmentTargets.sectionId, sections.id))
    .where(
      inArray(
        assignmentTargets.assignmentId,
        rows.map((r) => r.id),
      ),
    );

  const byAssignment = new Map<string, { names: string[]; ids: string[] }>();
  for (const t of targets) {
    const entry = byAssignment.get(t.assignmentId) ?? { names: [], ids: [] };
    entry.names.push(t.sectionName);
    entry.ids.push(t.sectionId);
    byAssignment.set(t.assignmentId, entry);
  }

  return rows.map((r) => ({
    ...r,
    targetSections: byAssignment.get(r.id)?.names ?? [],
    targetSectionIds: byAssignment.get(r.id)?.ids ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  type: "INSTITUTION" | "DEPARTMENT" | "SECTION";
  departmentId: string | null;
  createdById: string;
  createdByName: string;
  createdAt: Date;
  isActive: boolean;
  targetSections: string[];
};

export type NoticeAudience =
  | { role: "ADMIN" }
  | { role: "HOD"; departmentIds: string[] }
  | { role: "TEACHER"; departmentId: string; sectionIds: string[] }
  | { role: "STUDENT"; departmentId: string; sectionId: string | null };

const noticeSelection = {
  id: notices.id,
  title: notices.title,
  body: notices.body,
  type: notices.type,
  departmentId: notices.departmentId,
  createdById: notices.createdById,
  createdByName: user.name,
  createdAt: notices.createdAt,
  isActive: notices.isActive,
};

/** Attaches target section names to SECTION notices. */
async function attachNoticeTargets(
  rows: Omit<NoticeRow, "targetSections">[],
): Promise<NoticeRow[]> {
  const sectionNoticeIds = rows
    .filter((r) => r.type === "SECTION")
    .map((r) => r.id);
  if (sectionNoticeIds.length === 0) {
    return rows.map((r) => ({ ...r, targetSections: [] }));
  }

  const targets = await db
    .select({
      noticeId: noticeTargets.noticeId,
      sectionName: sections.name,
    })
    .from(noticeTargets)
    .innerJoin(sections, eq(noticeTargets.sectionId, sections.id))
    .where(inArray(noticeTargets.noticeId, sectionNoticeIds));

  const byNotice = new Map<string, string[]>();
  for (const t of targets) {
    const names = byNotice.get(t.noticeId) ?? [];
    names.push(t.sectionName);
    byNotice.set(t.noticeId, names);
  }

  return rows.map((r) => ({
    ...r,
    targetSections: byNotice.get(r.id) ?? [],
  }));
}

/** Active notices visible to the given audience, newest first. */
export async function listNoticesFor(
  audience: NoticeAudience,
): Promise<NoticeRow[]> {
  let visibility;
  switch (audience.role) {
    case "ADMIN":
      visibility = undefined;
      break;
    case "HOD":
      visibility = or(
        eq(notices.type, "INSTITUTION"),
        audience.departmentIds.length
          ? and(
              eq(notices.type, "DEPARTMENT"),
              inArray(notices.departmentId, audience.departmentIds),
            )
          : undefined,
        audience.departmentIds.length
          ? and(
              eq(notices.type, "SECTION"),
              inArray(
                notices.id,
                db
                  .select({ noticeId: noticeTargets.noticeId })
                  .from(noticeTargets)
                  .innerJoin(
                    sections,
                    eq(noticeTargets.sectionId, sections.id),
                  )
                  .where(
                    inArray(sections.departmentId, audience.departmentIds),
                  ),
              ),
            )
          : undefined,
      );
      break;
    case "TEACHER":
      visibility = or(
        eq(notices.type, "INSTITUTION"),
        and(
          eq(notices.type, "DEPARTMENT"),
          eq(notices.departmentId, audience.departmentId),
        ),
        audience.sectionIds.length
          ? and(
              eq(notices.type, "SECTION"),
              inArray(
                notices.id,
                db
                  .select({ noticeId: noticeTargets.noticeId })
                  .from(noticeTargets)
                  .where(inArray(noticeTargets.sectionId, audience.sectionIds)),
              ),
            )
          : undefined,
      );
      break;
    case "STUDENT":
      visibility = or(
        eq(notices.type, "INSTITUTION"),
        and(
          eq(notices.type, "DEPARTMENT"),
          eq(notices.departmentId, audience.departmentId),
        ),
        audience.sectionId
          ? and(
              eq(notices.type, "SECTION"),
              inArray(
                notices.id,
                db
                  .select({ noticeId: noticeTargets.noticeId })
                  .from(noticeTargets)
                  .where(eq(noticeTargets.sectionId, audience.sectionId)),
              ),
            )
          : undefined,
      );
      break;
  }

  const rows = await db
    .select(noticeSelection)
    .from(notices)
    .innerJoin(user, eq(notices.createdById, user.id))
    .where(and(eq(notices.isActive, true), visibility))
    .orderBy(desc(notices.createdAt))
    .limit(100);

  return attachNoticeTargets(rows);
}

/** Notices created by this user (teacher/HOD manage views), newest first. */
export async function listMyNotices(createdById: string): Promise<NoticeRow[]> {
  const rows = await db
    .select(noticeSelection)
    .from(notices)
    .innerJoin(user, eq(notices.createdById, user.id))
    .where(eq(notices.createdById, createdById))
    .orderBy(desc(notices.createdAt))
    .limit(100);

  return attachNoticeTargets(rows);
}
