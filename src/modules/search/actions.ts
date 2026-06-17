"use server";

import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  departments,
  hodAssignments,
  sections,
  students,
  subjects,
  teachers,
  user,
} from "@/db/schema";
import { adminAction, hodAction } from "@/lib/safe-action";

const searchSchema = z.object({
  query: z.string().trim().min(2, "Type at least 2 characters").max(80),
});

export type SearchResult = {
  group: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const LIMIT = 6;

async function searchEntities(
  q: string,
  scope: { departmentIds?: string[]; portal: "admin" | "hod" },
): Promise<SearchResult[]> {
  const pattern = `%${q}%`;
  const base = scope.portal === "admin" ? "/admin" : "/hod";
  const deptFilter = scope.departmentIds;
  const results: SearchResult[] = [];

  const studentRows = await db
    .select({
      id: students.id,
      name: user.name,
      rollNumber: students.rollNumber,
      departmentName: departments.name,
    })
    .from(students)
    .innerJoin(user, eq(students.userId, user.id))
    .innerJoin(departments, eq(students.departmentId, departments.id))
    .where(
      and(
        or(
          ilike(user.name, pattern),
          ilike(students.rollNumber, pattern),
          ilike(user.email, pattern),
        ),
        deptFilter ? inArray(students.departmentId, deptFilter) : undefined,
      ),
    )
    .limit(LIMIT);
  results.push(
    ...studentRows.map((s) => ({
      group: "Students",
      id: s.id,
      title: s.name,
      subtitle: `${s.rollNumber} · ${s.departmentName}`,
      href: `${base}/students/${s.id}`,
    })),
  );

  const teacherRows = await db
    .select({
      id: teachers.id,
      name: user.name,
      email: user.email,
      departmentName: departments.name,
    })
    .from(teachers)
    .innerJoin(user, eq(teachers.userId, user.id))
    .innerJoin(departments, eq(teachers.departmentId, departments.id))
    .where(
      and(
        or(ilike(user.name, pattern), ilike(user.email, pattern)),
        deptFilter ? inArray(teachers.departmentId, deptFilter) : undefined,
      ),
    )
    .limit(LIMIT);
  results.push(
    ...teacherRows.map((t) => ({
      group: "Teachers",
      id: t.id,
      title: t.name,
      subtitle: `${t.email} · ${t.departmentName}`,
      href: `${base}/teachers`,
    })),
  );

  if (scope.portal === "admin") {
    const hodRows = await db
      .select({
        id: hodAssignments.id,
        name: user.name,
        departmentName: departments.name,
      })
      .from(hodAssignments)
      .innerJoin(user, eq(hodAssignments.userId, user.id))
      .innerJoin(departments, eq(hodAssignments.departmentId, departments.id))
      .where(ilike(user.name, pattern))
      .limit(LIMIT);
    results.push(
      ...hodRows.map((h) => ({
        group: "HODs",
        id: h.id,
        title: h.name,
        subtitle: h.departmentName,
        href: "/admin/hods",
      })),
    );

    const departmentRows = await db
      .select({ id: departments.id, name: departments.name, code: departments.code })
      .from(departments)
      .where(or(ilike(departments.name, pattern), ilike(departments.code, pattern)))
      .limit(LIMIT);
    results.push(
      ...departmentRows.map((d) => ({
        group: "Departments",
        id: d.id,
        title: d.name,
        subtitle: d.code,
        href: "/admin/departments",
      })),
    );
  }

  const sectionRows = await db
    .select({
      id: sections.id,
      name: sections.name,
      departmentName: departments.name,
    })
    .from(sections)
    .innerJoin(departments, eq(sections.departmentId, departments.id))
    .where(
      and(
        ilike(sections.name, pattern),
        deptFilter ? inArray(sections.departmentId, deptFilter) : undefined,
      ),
    )
    .limit(LIMIT);
  results.push(
    ...sectionRows.map((s) => ({
      group: "Sections",
      id: s.id,
      title: s.name,
      subtitle: s.departmentName,
      href:
        scope.portal === "admin"
          ? `/admin/timetables?sectionId=${s.id}`
          : `/hod/timetables?sectionId=${s.id}`,
    })),
  );

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      departmentName: departments.name,
    })
    .from(subjects)
    .innerJoin(departments, eq(subjects.departmentId, departments.id))
    .where(
      and(
        or(ilike(subjects.name, pattern), ilike(subjects.code, pattern)),
        deptFilter ? inArray(subjects.departmentId, deptFilter) : undefined,
      ),
    )
    .limit(LIMIT);
  results.push(
    ...subjectRows.map((s) => ({
      group: "Subjects",
      id: s.id,
      title: s.name,
      subtitle: `${s.code} · ${s.departmentName}`,
      href: scope.portal === "admin" ? "/admin/subjects" : "/hod/teacher-assignments",
    })),
  );

  return results;
}

/** Global search across the institution (SRS §13). */
export const adminGlobalSearch = adminAction
  .metadata({ actionName: "search.admin" })
  .inputSchema(searchSchema)
  .action(async ({ parsedInput }) => {
    return searchEntities(parsedInput.query, { portal: "admin" });
  });

/** Department-scoped search (SRS §14). */
export const hodScopedSearch = hodAction
  .metadata({ actionName: "search.hod" })
  .inputSchema(searchSchema)
  .action(async ({ parsedInput, ctx }) => {
    return searchEntities(parsedInput.query, {
      portal: "hod",
      departmentIds: ctx.departmentIds,
    });
  });
