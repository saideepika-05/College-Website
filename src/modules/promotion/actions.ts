"use server";

import { revalidatePath } from "next/cache";
import { assertDepartmentInScope } from "@/lib/authz";
import { actionError, adminAction, hodAction } from "@/lib/safe-action";
import { departmentOfSection } from "@/modules/teaching/service";
import { graduateSchema, promoteSchema } from "./schemas";
import { graduateStudents, promoteStudents } from "./service";

function revalidatePromotion() {
  revalidatePath("/admin/promotion");
  revalidatePath("/hod/promotion");
  revalidatePath("/admin/students");
  revalidatePath("/hod/students");
}

export const adminPromoteStudents = adminAction
  .metadata({ actionName: "promotion.promote" })
  .inputSchema(promoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await promoteStudents(ctx.user.id, parsedInput);
    revalidatePromotion();
    return result;
  });

export const hodPromoteStudents = hodAction
  .metadata({ actionName: "promotion.promote.hod" })
  .inputSchema(promoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfSection(parsedInput.fromSectionId);
    if (!dept) actionError("Section not found.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    const result = await promoteStudents(ctx.user.id, parsedInput);
    revalidatePromotion();
    return result;
  });

export const adminGraduateStudents = adminAction
  .metadata({ actionName: "promotion.graduate" })
  .inputSchema(graduateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const completed = await graduateStudents(ctx.user.id, parsedInput);
    revalidatePromotion();
    return { completed };
  });

export const hodGraduateStudents = hodAction
  .metadata({ actionName: "promotion.graduate.hod" })
  .inputSchema(graduateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const dept = await departmentOfSection(parsedInput.sectionId);
    if (!dept) actionError("Section not found.");
    assertDepartmentInScope(ctx.departmentIds, dept!);
    const completed = await graduateStudents(ctx.user.id, parsedInput);
    revalidatePromotion();
    return { completed };
  });
