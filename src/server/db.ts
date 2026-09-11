import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

/**
 * Shared server-side DB handle. `server-only` makes any accidental import
 * from client code a build error rather than a leaked connection string.
 * Cached on `globalThis` so Next.js dev-mode hot reload doesn't open a new
 * Postgres connection pool on every module re-evaluation.
 */
declare global {
  var __freshrouteDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 5 });
  return drizzle(client, { schema });
}

export const db = globalThis.__freshrouteDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__freshrouteDb = db;
