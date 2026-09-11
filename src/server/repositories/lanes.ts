import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { lane } from "@/db/schema";

/** No real route/distance data has been sourced yet (0 rows today) — see
 * src/server/context/buildRealBatchBaseline.ts for the documented fallback
 * this forces the context builder to use. */
export async function getLane(originRef: string, destinationMarketId: string) {
  const rows = await db
    .select()
    .from(lane)
    .where(and(eq(lane.originRef, originRef), eq(lane.destinationMarketId, destinationMarketId)))
    .limit(1);
  return rows[0] ?? null;
}
