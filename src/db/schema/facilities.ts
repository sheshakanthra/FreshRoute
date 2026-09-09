import { pgTable, uuid, text, numeric, integer } from "drizzle-orm/pg-core";
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
});
