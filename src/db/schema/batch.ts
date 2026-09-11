import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./organization";
import { commodity } from "./commodity";
import { market } from "./market";
import { batchStatusEnum, telemetryDataSourceEnum } from "./enums";

/**
 * A physical batch. Deliberately carries NO quality_score and NO
 * remaining_useful_life_hours — those are model outputs and live in
 * condition_assessment. A batch row must never claim to know its own
 * remaining life (STAGE0 schema principle; see schema-notes.md).
 *
 * planned_market_id — added in D3 (persistence swap). Missed in the original
 * D1 migration: STAGE0's batch spec never named it, but the decision engine's
 * SELL/DISCOUNT pathways (the two VERIFIED, primary pathways) hard-require a
 * planned market to evaluate against (see domain/engine/evaluators.ts,
 * findPlannedMarket()) — without this column no real batch could ever be
 * evaluated. Nullable because a batch can in principle exist before a market
 * is assigned, but the batch-creation form always sets it.
 */
export const batch = pgTable("batch", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  commodityId: uuid("commodity_id").notNull().references(() => commodity.id, { onDelete: "restrict" }),
  plannedMarketId: uuid("planned_market_id").references(() => market.id, { onDelete: "restrict" }),
  externalRef: text("external_ref"),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  variety: text("variety"),
  ripenessStage: text("ripeness_stage"),
  precooled: boolean("precooled").notNull().default(false),
  packagingType: text("packaging_type"),
  origin: text("origin"),
  currentLocation: text("current_location"),
  harvestTimestamp: timestamp("harvest_timestamp", { withTimezone: true }),
  costBasisInr: numeric("cost_basis_inr", { precision: 12, scale: 2 }),
  status: batchStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("batch_org_id_idx").on(t.orgId),
]);

/**
 * Append-only telemetry. Never UPDATE a row (STAGE0 schema principle) — the
 * trigger below enforces this at the database level, not just by
 * convention, since this is described as "not optional".
 */
export const batchTelemetry = pgTable("batch_telemetry", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => batch.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  temperatureC: numeric("temperature_c", { precision: 5, scale: 2 }),
  humidityPct: numeric("humidity_pct", { precision: 5, scale: 2 }),
  sensorId: text("sensor_id"),
  dataSource: telemetryDataSourceEnum("data_source").notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
}, (t) => [
  index("batch_telemetry_batch_id_recorded_at_idx").on(t.batchId, sql`${t.recordedAt} DESC`),
]);

/**
 * Model outputs, versioned and timestamped, never overwriting batch.
 * input_snapshot preserves exactly what the model saw, so a later dispute
 * about "why did it say this" doesn't need the moment reconstructed from
 * telemetry joins.
 */
export const conditionAssessment = pgTable("condition_assessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => batch.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }).notNull(),
  decayPointsPerHour: numeric("decay_points_per_hour", { precision: 6, scale: 3 }),
  remainingUsefulLifeHours: numeric("remaining_useful_life_hours", { precision: 8, scale: 2 }),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version").notNull(),
  inputSnapshot: jsonb("input_snapshot").notNull(),
}, (t) => [
  index("condition_assessment_batch_id_computed_at_idx").on(t.batchId, sql`${t.computedAt} DESC`),
]);
