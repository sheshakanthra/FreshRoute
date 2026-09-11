import "server-only";
import { db } from "../db";
import { organization } from "@/db/schema";

/**
 * Single-tenant bootstrap helper. Only one organization exists in this
 * build stage (seeded by scripts/db/seed.ts) — there is no auth/session
 * layer yet to resolve "the current org" any other way. Every write in D3
 * goes through this so the multi-tenant column (org_id) is always populated
 * correctly even though there's exactly one tenant today.
 */
export async function getDefaultOrganization() {
  const rows = await db.select().from(organization).limit(1);
  if (rows.length === 0) {
    throw new Error("No organization exists — run scripts/db/seed.ts first.");
  }
  return rows[0];
}
