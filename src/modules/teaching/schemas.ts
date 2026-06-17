import { z } from "zod";
import { DAYS_OF_WEEK } from "@/lib/labels";

export const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1, "Select a teacher"),
  subjectId: z.string().min(1, "Select a subject"),
  sectionId: z.string().min(1, "Select a section"),
});

export const deleteTeacherAssignmentSchema = z.object({
  id: z.string().min(1),
});

const timeHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24h HH:MM format");

export const timetableEntrySchema = z
  .object({
    sectionId: z.string().min(1, "Select a section"),
    subjectId: z.string().min(1, "Select a subject"),
    teacherId: z.string().min(1, "Select a teacher"),
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    periodNo: z.number().int().min(1).max(8),
    startTime: timeHHMM,
    endTime: timeHHMM,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const deleteTimetableEntrySchema = z.object({
  id: z.string().min(1),
});
