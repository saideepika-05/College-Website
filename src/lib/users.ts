import "server-only";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { account, user } from "@/db/schema";
import type { Database, Transaction } from "@/db";
import type { Role } from "@/lib/session";

/**
 * Provisions a login (user + credential account) the way Better Auth
 * expects, inside the caller's transaction so user + domain profile
 * (student/teacher) are created atomically.
 */
export async function createUserWithCredentials(
  tx: Transaction | Database,
  input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  },
): Promise<{ userId: string }> {
  const userId = uuidv7();
  const passwordHash = await hashPassword(input.password);

  await tx.insert(user).values({
    id: userId,
    name: input.name,
    email: input.email.toLowerCase().trim(),
    emailVerified: true,
    role: input.role,
    isActive: true,
  });

  await tx.insert(account).values({
    id: uuidv7(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });

  return { userId };
}

/** Replaces the credential password for a user (admin/HOD initiated reset). */
export async function setUserPassword(
  tx: Transaction | Database,
  userId: string,
  newPassword: string,
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await tx
    .update(account)
    .set({ password: passwordHash })
    .where(eq(account.userId, userId));
}
