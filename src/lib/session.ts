import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export type Role = "ADMIN" | "HOD" | "TEACHER" | "STUDENT";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

/** Per-request-cached session lookup. */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as unknown as SessionUser & Record<string, unknown>;
  if (!u.isActive) return null;
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    } satisfies SessionUser,
    session: session.session,
  };
});

export const PORTAL_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  HOD: "/hod",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

/**
 * Hard gate for portal layouts/pages. Redirects to /login when
 * unauthenticated and to the caller's own portal on role mismatch.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== role) redirect(PORTAL_HOME[session.user.role]);
  return session.user;
}
