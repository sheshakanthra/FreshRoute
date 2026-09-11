import "server-only";
import { db } from "../db";
import { processingFacility, storageFacility } from "@/db/schema";

/**
 * Both tables are real (D1 schema) but genuinely empty today — no storage
 * or processing facility data has ever been sourced (D0 only pulled market
 * prices). These return whatever is actually in the DB, which right now is
 * nothing. That's correct: it makes STORE/PROCESS/DIVERT infeasible for
 * every real batch via the engine's own existing "no configured facility"
 * branch (evaluators.ts) — an honest degradation, not a bug to paper over
 * with invented facility rows.
 */
export async function listStorageFacilities() {
  return db.select().from(storageFacility);
}

export async function listProcessingFacilities() {
  return db.select().from(processingFacility);
}
