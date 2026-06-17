import { z } from "zod";

const name = z.string().trim().min(2, "Name is too short").max(100);
const email = z.string().trim().email("Enter a valid email").max(200);
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100);

export const studentCreateSchema = z.object({
  name,
  email,
  rollNumber: z
    .string()
    .trim()
    .min(3, "Roll number is too short")
    .max(30)
    .regex(/^[A-Z0-9-]+$/i, "Letters, digits and hyphens only"),
  departmentId: z.string().min(1, "Select a department"),
  sectionId: z.string().min(1, "Select a section"),
  password,
});

export const studentUpdateSchema = z.object({
  id: z.string().min(1),
  name,
  email,
  rollNumber: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9-]+$/i, "Letters, digits and hyphens only"),
});

export const transferStudentSchema = z.object({
  studentId: z.string().min(1),
  newSectionId: z.string().min(1, "Select the destination section"),
});

export const teacherCreateSchema = z.object({
  name,
  email,
  departmentId: z.string().min(1, "Select a department"),
  password,
});

export const teacherUpdateSchema = z.object({
  id: z.string().min(1),
  name,
  email,
});

export const hodCreateSchema = z.object({
  name,
  email,
  departmentId: z.string().min(1, "Select a department"),
  password,
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: password,
});

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});
