import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";

/** One row of the recommendation_outcomes view (drizzle/0004_...sql) — the
 * future ML training set: recommendation -> action_execution ->
 * outcome_record, one row per recommendation. Typed by hand since it's a
 * plain SQL view, not a table declared in src/db/schema. */
export interface RecommendationOutcomeRow {
  recommendation_id: string;
  batch_id: string;
  commodity_id: string;
  batch_variety: string | null;
  quantity_kg: string;
  chosen_action_code: string | null;
  recommendation_status: string;
  generated_at: Date;
  valid_until: Date;
  expected_recoverable_value_inr: string;
  baseline_value_inr: string;
  modelled_uplift_inr: string;
  confidence: string | null;
  engine_version: string;
  action_execution_id: string | null;
  executed_action_code: string | null;
  executed_at: Date | null;
  executed_by: string | null;
  execution_notes: string | null;
  outcome_record_id: string | null;
  realized_value_inr: string | null;
  realized_loss_kg: string | null;
  actual_destination: string | null;
  outcome_notes: string | null;
  outcome_recorded_at: Date | null;
  outcome_data_source: string | null;
  [key: string]: unknown;
}

export async function listRecommendationOutcomes(): Promise<RecommendationOutcomeRow[]> {
  const result = await db.execute<RecommendationOutcomeRow>(
    sql`select * from recommendation_outcomes order by generated_at desc`,
  );
  return [...result];
}

export async function getRecommendationOutcome(recommendationId: string): Promise<RecommendationOutcomeRow | null> {
  const result = await db.execute<RecommendationOutcomeRow>(
    sql`select * from recommendation_outcomes where recommendation_id = ${recommendationId} limit 1`,
  );
  return result[0] ?? null;
}
