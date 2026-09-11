import { pgTable, uuid, text, numeric, jsonb, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { marketTypeEnum } from "./enums";

/**
 * Canonical markets only — never a raw source label. D0 measured 455 raw
 * AGMARKNET market-name strings collapsing to 275 real markets (duplicate
 * "(Uzhavar Sandhai)" / "(Uzhavar Sandhai) APMC" listings of the same market,
 * 99.9% price-identical on shared days). This table holds only the 275.
 * Raw-name resolution lives in market_alias below.
 *
 * market_type is a stored, required column (D0 finding #4) — Uzhavar Sandhai
 * (retail farmers' markets) and APMC (wholesale) price levels are not
 * comparable, and deriving the split from the name string at query time is
 * exactly how that gets mixed by accident.
 */
export const market = pgTable("market", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  district: text("district"),
  state: text("state").notNull().default("Tamil Nadu"),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lon: numeric("lon", { precision: 9, scale: 6 }),
  externalCode: text("external_code"),
  marketType: marketTypeEnum("market_type").notNull(),
  /** Kept per STAGE0 spec alongside market_alias: a quick-reference array of
   * known raw labels. market_alias is the source of truth for resolution
   * (it carries the unique constraint and mapping notes); this column is a
   * denormalized convenience for display, not queried for dedup logic. */
  aliases: jsonb("aliases").notNull().default([]),
}, (t) => [
  uniqueIndex("market_name_district_uq").on(t.name, t.district),
]);

/**
 * The checked-in lookup table (D0: 455 raw names -> 275 canonical),
 * materialized in the DB. Seeded from data/validation/lookup/markets_tn.csv
 * — see scripts/db/seed.ts. D2's loader resolves every raw source name
 * through this table before insert; an unresolvable raw name is rejected
 * and logged (ingestion_run), never guessed into a canonical row.
 *
 * UNIQUE(raw_name): a raw name resolves to exactly one canonical market.
 * Multiple raw_name rows may point at the same market_canonical_id — that's
 * the whole point (455 -> 275).
 */
export const marketAlias = pgTable("market_alias", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawName: text("raw_name").notNull().unique(),
  marketCanonicalId: uuid("market_canonical_id").notNull().references(() => market.id, { onDelete: "restrict" }),
  /** e.g. "apmc_suffix_stripped_duplicate_listing" — why this raw name maps
   * where it does. Empty string when the mapping is a plain 1:1 name match. */
  mappingNote: text("mapping_note").notNull().default(""),
  isDuplicateListing: boolean("is_duplicate_listing").notNull().default(false),
  source: text("source").notNull().default("data.gov.in"),
  seededFrom: text("seeded_from").notNull().default("data/validation/lookup/markets_tn.csv"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
