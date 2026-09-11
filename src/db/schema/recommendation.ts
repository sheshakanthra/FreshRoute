import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { AnyPgColumn } from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { batch } from "./batch";
import { actionType } from "./actionType";
import { recommendationStatusEnum, outcomeDataSourceEnum } from "./enums";

/**
 * One issued recommendation. org_id denormalized from batch — required
 * explicitly by the D1 brief, and consistent with every other org-owned
 * operational table in this schema (see schema-notes.md).
 *
 * superseded_by_id is a self-reference: regenerating a recommendation for
 * the same batch doesn't delete the old row, it points to what replaced it —
 * the audit trail stays intact.
 */
export const recommendation = pgTable("recommendation", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => batch.id, { onDelete: "restrict" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  // Nullable — added in D3. The engine's own no-feasible-pathway safe state
  // (RecommendationCard's NoFeasiblePathwayCard) has no winning action to
  // record; that state is a real, designed outcome (STAGE0: the
  // NO_FEASIBLE_PATHWAY margin status), not an error, and this table must
  // be able to persist it rather than silently dropping it.
  chosenActionCode: text("chosen_action_code").references(() => actionType.code, { onDelete: "restrict" }),
  destinationRef: text("destination_ref"),
  expectedRecoverableValueInr: numeric("expected_recoverable_value_inr", { precision: 12, scale: 2 }).notNull(),
  baselineValueInr: numeric("baseline_value_inr", { precision: 12, scale: 2 }).notNull(),
  modelledUpliftInr: numeric("modelled_uplift_inr", { precision: 12, scale: 2 }).notNull(),
  spoilageProbability: numeric("spoilage_probability", { precision: 5, scale: 4 }),
  baselineSpoilageProbability: numeric("baseline_spoilage_probability", { precision: 5, scale: 4 }),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  reasons: jsonb("reasons").notNull().default([]),
  costBreakdown: jsonb("cost_breakdown").notNull().default({}),
  engineVersion: text("engine_version").notNull(),
  modelVersions: jsonb("model_versions").notNull().default({}),
  featureSnapshot: jsonb("feature_snapshot").notNull().default({}),
  dataProvenance: jsonb("data_provenance").notNull().default({}),
  containsSimulatedData: boolean("contains_simulated_data").notNull().default(false),
  status: recommendationStatusEnum("status").notNull().default("ISSUED"),
  supersededById: uuid("superseded_by_id").references((): AnyPgColumn => recommendation.id, { onDelete: "set null" }),
}, (t) => [
  index("recommendation_batch_id_idx").on(t.batchId),
  index("recommendation_org_id_idx").on(t.orgId),
]);

/**
 * Every evaluated option, not just the winner — this is the audit trail
 * AND the future backtest/training set (STAGE0: "After Stage 0" note).
 * org_id denormalized from recommendation, same reasoning as elsewhere.
 */
export const recommendationCandidate = pgTable("recommendation_candidate", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id").notNull().references(() => recommendation.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  actionCode: text("action_code").notNull().references(() => actionType.code, { onDelete: "restrict" }),
  destinationRef: text("destination_ref"),
  expectedValueInr: numeric("expected_value_inr", { precision: 12, scale: 2 }).notNull(),
  spoilageProbability: numeric("spoilage_probability", { precision: 5, scale: 4 }),
  qualityAtSale: numeric("quality_at_sale", { precision: 5, scale: 2 }),
  exposureHours: numeric("exposure_hours", { precision: 8, scale: 2 }),
  feasible: boolean("feasible").notNull(),
  infeasibleReason: text("infeasible_reason"),
  rank: integer("rank").notNull(),
  costs: jsonb("costs").notNull().default({}),
}, (t) => [
  index("recommendation_candidate_recommendation_id_idx").on(t.recommendationId),
]);

/** Written starting D4. Exists now so nothing downstream needs a rewrite
 * to record what actually happened. */
export const actionExecution = pgTable("action_execution", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id").notNull().references(() => recommendation.id, { onDelete: "restrict" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  executedActionCode: text("executed_action_code").notNull().references(() => actionType.code, { onDelete: "restrict" }),
  executedBy: text("executed_by"),
  notes: text("notes"),
}, (t) => [
  index("action_execution_recommendation_id_idx").on(t.recommendationId),
]);

/**
 * Written starting D4, but exists from the FIRST migration — STAGE0 calls
 * this "the single most expensive thing to defer": without it, nothing
 * about what actually happened to a batch is ever captured, and the
 * backtest that Stage 0 exists to enable has no ground truth to compare
 * against.
 */
export const outcomeRecord = pgTable("outcome_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => batch.id, { onDelete: "restrict" }),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "restrict" }),
  recommendationId: uuid("recommendation_id").references(() => recommendation.id, { onDelete: "set null" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  realizedValueInr: numeric("realized_value_inr", { precision: 12, scale: 2 }),
  realizedLossKg: numeric("realized_loss_kg", { precision: 10, scale: 2 }),
  actualDestination: text("actual_destination"),
  notes: text("notes"),
  dataSource: outcomeDataSourceEnum("data_source").notNull(),
}, (t) => [
  index("outcome_record_batch_id_idx").on(t.batchId),
]);
