import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  academicSessions,
  branches,
  departments,
  sections,
  subjects,
} from "@/db/schema";

export async function listBranches() {
  return db.select().from(branches).orderBy(asc(branches.name));
}

export async function listDepartments() {
  return db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      branchId: departments.branchId,
      branchName: branches.name,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
    })
    .from(departments)
    .innerJoin(branches, eq(departments.branchId, branches.id))
    .orderBy(asc(branches.name), asc(departments.name));
}

export async function listAcademicSessions() {
  return db
    .select()
    .from(academicSessions)
    .orderBy(desc(academicSessions.label));
}

export async function listSections() {
  return db
    .select({
      id: sections.id,
      name: sections.name,
      yearLevel: sections.yearLevel,
      departmentId: sections.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
      academicSessionId: sections.academicSessionId,
      sessionLabel: academicSessions.label,
      isActive: sections.isActive,
    })
    .from(sections)
    .innerJoin(departments, eq(sections.departmentId, departments.id))
    .innerJoin(
      academicSessions,
      eq(sections.academicSessionId, academicSessions.id),
    )
    .orderBy(
      desc(academicSessions.label),
      asc(departments.name),
      asc(sections.yearLevel),
      asc(sections.name),
    );
}

export async function listSubjects() {
  return db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      yearLevel: subjects.yearLevel,
      departmentId: subjects.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
      isActive: subjects.isActive,
    })
    .from(subjects)
    .innerJoin(departments, eq(subjects.departmentId, departments.id))
    .orderBy(asc(departments.name), asc(subjects.yearLevel), asc(subjects.name));
}
