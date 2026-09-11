import { pgTable, text } from "drizzle-orm/pg-core";
import { evidenceTierEnum } from "./enums";

/**
 * Reference table, text PK by design (STAGE0 spec: "code PK") — the six
 * recovery actions are a fixed, small vocabulary referenced by code
 * throughout recommendation/recommendation_candidate/action_execution.
 * Seeded in scripts/db/seed.ts: SELL/DISCOUNT/DIVERT = VERIFIED,
 * REROUTE/STORE/PROCESS = PLAUSIBLE_UNVERIFIED.
 */
export const actionType = pgTable("action_type", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  evidenceTier: evidenceTierEnum("evidence_tier").notNull(),
});
