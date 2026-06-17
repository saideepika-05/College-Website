import { z } from "zod";

export const promoteSchema = z.object({
  fromSectionId: z.string().min(1, "Pick the source section"),
  toSectionId: z.string().min(1, "Pick the destination section"),
  studentIds: z.array(z.string().min(1)).min(1, "Select at least one student"),
});

export const graduateSchema = z.object({
  sectionId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1, "Select at least one student"),
});
