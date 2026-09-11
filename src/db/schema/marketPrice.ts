import { pgTable, uuid, text, numeric, date, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { market } from "./market";
import { commodity } from "./commodity";
import { demandSourceEnum } from "./enums";

/**
 * Reference/fact table — not org-scoped; a market price is public data, not
 * owned by one tenant.
 *
 * market_id always points at a canonical market row (never a raw/duplicate
 * label) — that resolution happens once, at ingest, via market_alias. There
 * is deliberately no separate "market_canonical_id" column here: market_id
 * *is* the canonical id, by construction, so a second column would just be
 * a second name for the same fact. See schema-notes.md.
 *
 * demand_source defaults to ABSENT (D0: the data.gov.in archive resource has
 * no arrivals column at all — confirmed unavailable, not merely sparse).
 * arrival_qty_kg and its raw_* pair stay nullable rather than being dropped,
 * so a future arrivals source doesn't require a schema rewrite.
 *
 * is_duplicate_listing / duplicate_source_count operationalize D0 finding
 * #3: AGMARKNET lists many Uzhavar Sandhai markets twice a day under a
 * plain name and an " APMC"-suffixed name, 99.9% price-identical on shared
 * days. The UNIQUE constraint below is what actually stops the double
 * listing from becoming two rows; these two columns let D2's loader flag
 * that a duplicate raw listing was seen and collapsed, without deleting or
 * silently discarding that fact.
 */
export const marketPrice = pgTable("market_price", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id").notNull().references(() => market.id, { onDelete: "restrict" }),
  commodityId: uuid("commodity_id").notNull().references(() => commodity.id, { onDelete: "restrict" }),
  variety: text("variety").notNull(),
  grade: text("grade"),
  priceDate: date("price_date").notNull(),

  minPriceInrPerKg: numeric("min_price_inr_per_kg", { precision: 8, scale: 4 }),
  maxPriceInrPerKg: numeric("max_price_inr_per_kg", { precision: 8, scale: 4 }),
  modalPriceInrPerKg: numeric("modal_price_inr_per_kg", { precision: 8, scale: 4 }),
  rawPriceValue: numeric("raw_price_value", { precision: 12, scale: 4 }),
  rawPriceUnit: text("raw_price_unit").notNull().default("INR/quintal"),

  arrivalQtyKg: numeric("arrival_qty_kg", { precision: 12, scale: 2 }),
  rawArrivalValue: numeric("raw_arrival_value", { precision: 12, scale: 4 }),
  rawArrivalUnit: text("raw_arrival_unit"),
  demandSource: demandSourceEnum("demand_source").notNull().default("ABSENT"),

  isDuplicateListing: boolean("is_duplicate_listing").notNull().default(false),
  duplicateSourceCount: integer("duplicate_source_count").notNull().default(1),

  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  license: text("license").notNull(),
  rawRowHash: text("raw_row_hash").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("market_price_unique_series_day").on(
    t.marketId, t.commodityId, t.variety, t.grade, t.priceDate
  ),
]);
