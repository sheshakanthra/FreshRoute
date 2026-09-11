/**
 * Task 5: exports the recommendation -> action_execution -> outcome_record
 * join (drizzle/0004_recommendation_outcomes_view.sql) as CSV. This is the
 * future ML training set, made queryable from outside the app too — the
 * view itself is a real Postgres view, this route is just a convenience.
 */
import { NextResponse } from "next/server";
import { listRecommendationOutcomes, type RecommendationOutcomeRow } from "@/server/repositories/recommendationOutcomes";

const COLUMNS: (keyof RecommendationOutcomeRow)[] = [
  "recommendation_id",
  "batch_id",
  "commodity_id",
  "batch_variety",
  "quantity_kg",
  "chosen_action_code",
  "recommendation_status",
  "generated_at",
  "valid_until",
  "expected_recoverable_value_inr",
  "baseline_value_inr",
  "modelled_uplift_inr",
  "confidence",
  "engine_version",
  "action_execution_id",
  "executed_action_code",
  "executed_at",
  "executed_by",
  "execution_notes",
  "outcome_record_id",
  "realized_value_inr",
  "realized_loss_kg",
  "actual_destination",
  "outcome_notes",
  "outcome_recorded_at",
  "outcome_data_source",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const rows = await listRecommendationOutcomes();
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recommendation-outcomes.csv"`,
    },
  });
}
