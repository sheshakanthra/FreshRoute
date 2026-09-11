import "server-only";
import { getRecommendation } from "../repositories/recommendations";
import { createOutcomeRecord } from "../repositories/outcomeRecords";

/** Task 4: only accepted/overridden recommendations — a batch actually has
 * to have had something executed before there's a real outcome to record
 * against it (a REJECTED or still-ISSUED recommendation has no execution). */
export async function recordOutcomeForRecommendation(input: {
  recommendationId: string;
  batchId: string;
  orgId: string;
  realizedValueInr: number | null;
  realizedLossKg: number | null;
  actualDestination: string | null;
  notes: string | null;
}) {
  const rec = await getRecommendation(input.recommendationId);
  if (!rec) throw new Error(`Recommendation ${input.recommendationId} not found`);
  if (rec.status !== "ACCEPTED" && rec.status !== "OVERRIDDEN") {
    throw new Error(
      `Recommendation ${input.recommendationId} is ${rec.status} — an outcome can only be recorded for an ACCEPTED or OVERRIDDEN recommendation.`,
    );
  }

  return createOutcomeRecord({
    batchId: input.batchId,
    orgId: input.orgId,
    recommendationId: input.recommendationId,
    realizedValueInr: input.realizedValueInr,
    realizedLossKg: input.realizedLossKg,
    actualDestination: input.actualDestination,
    notes: input.notes,
    dataSource: "OPERATOR_REPORTED",
  });
}
