import { pgTable, uuid, text, numeric, integer, boolean, date } from "drizzle-orm/pg-core";
import { market } from "./market";
import { laneModeEnum } from "./enums";

/** Reference table — shared routing data, not org-scoped. */
export const lane = pgTable("lane", {
  id: uuid("id").primaryKey().defaultRandom(),
  originRef: text("origin_ref").notNull(),
  destinationMarketId: uuid("destination_market_id").notNull().references(() => market.id, { onDelete: "restrict" }),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }).notNull(),
  typicalTransitHours: numeric("typical_transit_hours", { precision: 6, scale: 2 }).notNull(),
  roadQualityIndex: numeric("road_quality_index", { precision: 4, scale: 2 }),
  mode: laneModeEnum("mode").notNull().default("ROAD"),
});

/** Reference table — a physical facility's specs are shared, objective data. */
export const storageFacility = pgTable("storage_facility", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lon: numeric("lon", { precision: 9, scale: 6 }),
  storageTempC: numeric("storage_temp_c", { precision: 5, scale: 2 }),
  storageHumidityPct: numeric("storage_humidity_pct", { precision: 5, scale: 2 }),
  costPerKgPerDay: numeric("cost_per_kg_per_day", { precision: 8, scale: 4 }),
  capacityKg: numeric("capacity_kg", { precision: 12, scale: 2 }),
  maxStorageDays: integer("max_storage_days"),
  /* Provenance — D5. A facility name with no citation is not a usable
   * record, so every row carries the directory it came from, that
   * directory's URL, and the date it was actually fetched. Rows are only
   * inserted when they were confirmed against a primary government
   * directory; unconfirmed leads live in docs/facilities/unverified-leads.md
   * and are deliberately kept out of these tables. in_covered_district flags
   * whether the facility's district is one we hold market_price data for —
   * NULL means the source's district field was rejected as unreliable and
   * no district could be established without guessing. */
  district: text("district"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  sourceAccessedOn: date("source_accessed_on"),
  verificationNote: text("verification_note"),
  inCoveredDistrict: boolean("in_covered_district"),
});

/** Reference table — same reasoning as storage_facility. */
export const processingFacility = pgTable("processing_facility", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lon: numeric("lon", { precision: 9, scale: 6 }),
  gatePricePerKg: numeric("gate_price_per_kg", { precision: 8, scale: 4 }),
  yieldRatio: numeric("yield_ratio", { precision: 5, scale: 4 }),
  minQualityScore: numeric("min_quality_score", { precision: 5, scale: 2 }),
  dailyCapacityKg: numeric("daily_capacity_kg", { precision: 12, scale: 2 }),
  productForm: text("product_form"),
  /* Provenance — D5. A facility name with no citation is not a usable
   * record, so every row carries the directory it came from, that
   * directory's URL, and the date it was actually fetched. Rows are only
   * inserted when they were confirmed against a primary government
   * directory; unconfirmed leads live in docs/facilities/unverified-leads.md
   * and are deliberately kept out of these tables. in_covered_district flags
   * whether the facility's district is one we hold market_price data for —
   * NULL means the source's district field was rejected as unreliable and
   * no district could be established without guessing. */
  district: text("district"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  sourceAccessedOn: date("source_accessed_on"),
  verificationNote: text("verification_note"),
  inCoveredDistrict: boolean("in_covered_district"),
});
