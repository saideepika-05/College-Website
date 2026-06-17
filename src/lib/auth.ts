import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { env } from "@/env";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Outside production, also trust Cloudflare quick-tunnel origins so a
  // shared localhost (cloudflared) can sign in.
  trustedOrigins:
    env.NODE_ENV === "production" ? [] : ["https://*.trycloudflare.com"],
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned only by Admin/HOD — public sign-up is off.
    disableSignUp: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "STUDENT",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh expiry once a day
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
  databaseHooks: {
    session: {
      create: {
        // Deactivated accounts cannot establish a session.
        before: async (session) => {
          const [u] = await db
            .select({ isActive: userTable.isActive })
            .from(userTable)
            .where(eq(userTable.id, session.userId))
            .limit(1);
          if (!u?.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "This account has been deactivated.",
            });
          }
          return { data: session };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
