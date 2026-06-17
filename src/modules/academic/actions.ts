"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  academicSessions,
  branches,
  departments,
  sections,
  subjects,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { actionError, adminAction } from "@/lib/safe-action";
import { z } from "zod";
import {
  academicSessionSchema,
  academicSessionUpdateSchema,
  branchSchema,
  branchUpdateSchema,
  departmentSchema,
  departmentUpdateSchema,
  sectionSchema,
  sectionUpdateSchema,
  setActiveSchema,
  subjectSchema,
  subjectUpdateSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export const createBranch = adminAction
  .metadata({ actionName: "branch.create" })
  .inputSchema(branchSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(branches).values(parsedInput).returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "CREATE",
        entityType: "branch",
        entityId: row!.id,
        after: row,
      });
      return row!;
    });
    revalidatePath("/admin/branches");
    return { id: created.id };
  });

export const updateBranch = adminAction
  .metadata({ actionName: "branch.update" })
  .inputSchema(branchUpdateSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx }) => {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(branches)
        .where(eq(branches.id, id));
      if (!before) actionError("Branch not found.");
      const [after] = await tx
        .update(branches)
        .set(data)
        .where(eq(branches.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "branch",
        entityId: id,
        before,
        after,
      });
    });
    revalidatePath("/admin/branches");
  });

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export const createDepartment = adminAction
  .metadata({ actionName: "department.create" })
  .inputSchema(departmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(departments)
        .values(parsedInput)
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "CREATE",
        entityType: "department",
        entityId: row!.id,
        after: row,
        departmentId: row!.id,
      });
      return row!;
    });
    revalidatePath("/admin/departments");
    return { id: created.id };
  });

export const updateDepartment = adminAction
  .metadata({ actionName: "department.update" })
  .inputSchema(departmentUpdateSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx }) => {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(departments)
        .where(eq(departments.id, id));
      if (!before) actionError("Department not found.");
      const [after] = await tx
        .update(departments)
        .set(data)
        .where(eq(departments.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "department",
        entityId: id,
        before,
        after,
        departmentId: id,
      });
    });
    revalidatePath("/admin/departments");
  });

// ---------------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------------

export const createAcademicSession = adminAction
  .metadata({ actionName: "academicSession.create" })
  .inputSchema(academicSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(academicSessions)
        .values(parsedInput)
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "CREATE",
        entityType: "academicSession",
        entityId: row!.id,
        after: row,
      });
      return row!;
    });
    revalidatePath("/admin/academic-sessions");
    return { id: created.id };
  });

export const updateAcademicSession = adminAction
  .metadata({ actionName: "academicSession.update" })
  .inputSchema(academicSessionUpdateSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx }) => {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(academicSessions)
        .where(eq(academicSessions.id, id));
      if (!before) actionError("Academic session not found.");
      const [after] = await tx
        .update(academicSessions)
        .set(data)
        .where(eq(academicSessions.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "academicSession",
        entityId: id,
        before,
        after,
      });
    });
    revalidatePath("/admin/academic-sessions");
  });

export const activateAcademicSession = adminAction
  .metadata({ actionName: "academicSession.activate" })
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id }, ctx }) => {
    await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(academicSessions)
        .where(eq(academicSessions.id, id));
      if (!target) actionError("Academic session not found.");
      // Deactivate the current one first — a partial unique index allows
      // at most one active session.
      await tx
        .update(academicSessions)
        .set({ isActive: false })
        .where(eq(academicSessions.isActive, true));
      const [after] = await tx
        .update(academicSessions)
        .set({ isActive: true })
        .where(eq(academicSessions.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "academicSession",
        entityId: id,
        before: target,
        after,
      });
    });
    revalidatePath("/admin/academic-sessions");
    revalidatePath("/admin");
  });

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const createSection = adminAction
  .metadata({ actionName: "section.create" })
  .inputSchema(sectionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(sections).values(parsedInput).returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "CREATE",
        entityType: "section",
        entityId: row!.id,
        after: row,
        departmentId: row!.departmentId,
      });
      return row!;
    });
    revalidatePath("/admin/sections");
    return { id: created.id };
  });

export const updateSection = adminAction
  .metadata({ actionName: "section.update" })
  .inputSchema(sectionUpdateSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx }) => {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(sections)
        .where(eq(sections.id, id));
      if (!before) actionError("Section not found.");
      const [after] = await tx
        .update(sections)
        .set(data)
        .where(eq(sections.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "section",
        entityId: id,
        before,
        after,
        departmentId: after!.departmentId,
      });
    });
    revalidatePath("/admin/sections");
  });

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const createSubject = adminAction
  .metadata({ actionName: "subject.create" })
  .inputSchema(subjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(subjects).values(parsedInput).returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "CREATE",
        entityType: "subject",
        entityId: row!.id,
        after: row,
        departmentId: row!.departmentId,
      });
      return row!;
    });
    revalidatePath("/admin/subjects");
    return { id: created.id };
  });

export const updateSubject = adminAction
  .metadata({ actionName: "subject.update" })
  .inputSchema(subjectUpdateSchema)
  .action(async ({ parsedInput: { id, ...data }, ctx }) => {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(subjects)
        .where(eq(subjects.id, id));
      if (!before) actionError("Subject not found.");
      const [after] = await tx
        .update(subjects)
        .set(data)
        .where(eq(subjects.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: "UPDATE",
        entityType: "subject",
        entityId: id,
        before,
        after,
        departmentId: after!.departmentId,
      });
    });
    revalidatePath("/admin/subjects");
  });

// ---------------------------------------------------------------------------
// Shared activate/deactivate
// ---------------------------------------------------------------------------

const ENTITY_TABLES = {
  branch: branches,
  department: departments,
  section: sections,
  subject: subjects,
} as const;

const ENTITY_PATHS: Record<keyof typeof ENTITY_TABLES, string> = {
  branch: "/admin/branches",
  department: "/admin/departments",
  section: "/admin/sections",
  subject: "/admin/subjects",
};

export const setEntityActive = adminAction
  .metadata({ actionName: "academic.setActive" })
  .inputSchema(setActiveSchema)
  .action(async ({ parsedInput: { id, entity, isActive }, ctx }) => {
    const table = ENTITY_TABLES[entity];
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(table).where(eq(table.id, id));
      if (!before) actionError("Record not found.");
      const [after] = await tx
        .update(table)
        .set({ isActive })
        .where(eq(table.id, id))
        .returning();
      await audit(tx, {
        actorId: ctx.user.id,
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: entity,
        entityId: id,
        before,
        after,
        departmentId:
          entity === "department"
            ? id
            : "departmentId" in before!
              ? ((before as { departmentId?: string }).departmentId ?? null)
              : null,
      });
    });
    revalidatePath(ENTITY_PATHS[entity]);
  });
