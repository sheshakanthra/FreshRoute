import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * DB client factory. Not imported by any app route/page yet — D1 is schema
 * and migrations only. This exists so scripts/db/seed.ts (and D3's future
 * repository layer) have one place to construct a connection.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 1 });
  return { db: drizzle(client, { schema }), client };
}
