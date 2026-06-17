import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";
import * as relations from "./relations";

const fullSchema = { ...schema, ...relations };

/**
 * Single pooled client. The standard `pg` driver speaks to Neon's pooled
 * endpoint and to local Postgres identically, so dev and production share
 * one code path. Cached on globalThis so Next.js HMR doesn't leak pools.
 */
const globalForDb = globalThis as unknown as { dbPool?: Pool };

const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === "production" ? 10 : 5,
  });

if (env.NODE_ENV !== "production") globalForDb.dbPool = pool;

export const db = drizzle(pool, { schema: fullSchema, casing: "snake_case" });

export type Database = NodePgDatabase<typeof fullSchema>;
export type Transaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
