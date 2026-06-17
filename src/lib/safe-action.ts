import "server-only";

import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from "next-safe-action";
import { z } from "zod";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  AuthorizationError,
  getHodDepartmentIds,
  getStudentScope,
  getTeacherScope,
} from "@/lib/authz";
import { getSession } from "@/lib/session";

/**
 * Action clients — every mutation in the app goes through one of these.
 * The middleware chain is: validate input (zod) → authenticate →
 * resolve role scope → run. Handlers receive a ctx whose scope they
 * MUST use to filter queries; they never re-derive identity from input.
 */

class ActionError extends Error {}

const baseClient = createSafeActionClient({
  defineMetadataSchema: () => z.object({ actionName: z.string() }),
  handleServerError(e) {
    if (e instanceof ActionError || e instanceof AuthorizationError) {
      return e.message;
    }
    // Surface unique-constraint violations as friendly messages.
    if (isUniqueViolation(e)) {
      return "A record with these details already exists.";
    }
    console.error("Action error:", e);
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
});

/** Throw inside an action to show `message` to the user. */
export function actionError(message: string): never {
  throw new ActionError(message);
}

export const authAction = baseClient.use(async ({ next }) => {
  const session = await getSession();
  if (!session) throw new AuthorizationError("You must be signed in.");
  return next({ ctx: { user: session.user } });
});

export const adminAction = authAction.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new AuthorizationError("Admin access required.");
  }
  return next({ ctx });
});

export const hodAction = authAction.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "HOD") {
    throw new AuthorizationError("HOD access required.");
  }
  const departmentIds = await getHodDepartmentIds(ctx.user.id);
  if (departmentIds.length === 0) {
    throw new AuthorizationError("No department is assigned to your account.");
  }
  return next({ ctx: { ...ctx, departmentIds } });
});

export const teacherAction = authAction.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "TEACHER") {
    throw new AuthorizationError("Teacher access required.");
  }
  const scope = await getTeacherScope(ctx.user.id);
  if (!scope) {
    throw new AuthorizationError("No teacher profile linked to your account.");
  }
  return next({ ctx: { ...ctx, scope } });
});

export const studentAction = authAction.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "STUDENT") {
    throw new AuthorizationError("Student access required.");
  }
  const scope = await getStudentScope(ctx.user.id);
  if (!scope) {
    throw new AuthorizationError("No student profile linked to your account.");
  }
  return next({ ctx: { ...ctx, scope } });
});
