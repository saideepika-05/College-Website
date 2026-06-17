import { z } from "zod";
import { YEAR_LEVELS } from "@/lib/labels";

const code = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters")
  .max(12, "Code must be at most 12 characters")
  .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, digits and hyphens only");

const name = z.string().trim().min(2, "Name is too short").max(100);

export const branchSchema = z.object({
  name,
  code,
  address: z.string().trim().max(300),
});

export const branchUpdateSchema = branchSchema.extend({
  id: z.string().min(1),
});

export const departmentSchema = z.object({
  name,
  code,
  branchId: z.string().min(1, "Select a branch"),
});

export const departmentUpdateSchema = departmentSchema.extend({
  id: z.string().min(1),
});

export const academicSessionSchema = z
  .object({
    label: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use the format 2026-2027"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .refine(
    (v) => {
      const [a, b] = v.label.split("-").map(Number);
      return b === (a ?? 0) + 1;
    },
    { message: "Session years must be consecutive", path: ["label"] },
  );

export const academicSessionUpdateSchema = z.object({
  id: z.string().min(1),
  label: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Use the format 2026-2027"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const sectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Section name is required")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, digits and hyphens only"),
  departmentId: z.string().min(1, "Select a department"),
  yearLevel: z.enum(YEAR_LEVELS),
  academicSessionId: z.string().min(1, "Select an academic session"),
});

export const sectionUpdateSchema = sectionSchema.extend({
  id: z.string().min(1),
});

export const subjectSchema = z.object({
  name,
  code,
  departmentId: z.string().min(1, "Select a department"),
  yearLevel: z.enum(YEAR_LEVELS),
});

export const subjectUpdateSchema = subjectSchema.extend({
  id: z.string().min(1),
});

export const setActiveSchema = z.object({
  id: z.string().min(1),
  entity: z.enum(["branch", "department", "section", "subject"]),
  isActive: z.boolean(),
});
