import { z } from "zod";

const assignmentTitle = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(150, "Title must be at most 150 characters");

const assignmentDescription = z
  .string()
  .trim()
  .max(2000, "Description must be at most 2000 characters");

const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date");

export const assignmentCreateSchema = z.object({
  title: assignmentTitle,
  description: assignmentDescription,
  subjectId: z.string().min(1, "Select a subject"),
  dueDate,
  sectionIds: z
    .array(z.string().min(1))
    .min(1, "Pick at least one section"),
});

export const assignmentUpdateSchema = z.object({
  id: z.string().min(1),
  title: assignmentTitle,
  description: assignmentDescription,
  dueDate,
});

export const assignmentDeleteSchema = z.object({
  id: z.string().min(1),
});

export const noticeCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must be at most 150 characters"),
  body: z
    .string()
    .trim()
    .min(3, "Body must be at least 3 characters")
    .max(5000, "Body must be at most 5000 characters"),
  /** Used only by the teacher (SECTION) variant. */
  sectionIds: z.array(z.string().min(1)).optional(),
  /** Used only by the HOD variant when they manage multiple departments. */
  departmentId: z.string().min(1).optional(),
});

export const noticeDeleteSchema = z.object({
  id: z.string().min(1),
});
