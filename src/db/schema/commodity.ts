import { pgTable, uuid, text, boolean, numeric } from "drizzle-orm/pg-core";

/**
 * Reference/dimension table — not org-scoped. A commodity's physical
 * parameters (climacteric behaviour, optimal storage temperature, decay
 * physiology) are objective facts shared by every tenant, not something one
 * org owns. See schema-notes.md, "why org_id isn't on every table".
 */
export const commodity = pgTable("commodity", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  climacteric: boolean("climacteric").notNull(),
  qualityFloorFresh: numeric("quality_floor_fresh", { precision: 4, scale: 3 }),
  qualityFloorProcess: numeric("quality_floor_process", { precision: 4, scale: 3 }),
  optimalTempC: numeric("optimal_temp_c", { precision: 5, scale: 2 }),
  chillingThresholdC: numeric("chilling_threshold_c", { precision: 5, scale: 2 }),
  optimalHumidityMin: numeric("optimal_humidity_min", { precision: 5, scale: 2 }),
  optimalHumidityMax: numeric("optimal_humidity_max", { precision: 5, scale: 2 }),
  q10: numeric("q10", { precision: 5, scale: 2 }),
  baseDecayPointsPerHour: numeric("base_decay_points_per_hour", { precision: 6, scale: 3 }),
  notes: text("notes"),
});
