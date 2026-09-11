import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { recommendation, recommendationCandidate } from "@/db/schema";
import type { RecoveryAction } from "@/domain/types";

export interface RecommendationInput {
  batchId: string;
  orgId: string;
  validUntil: Date;
  chosenActionCode: RecoveryAction | null;
  destinationRef: string | null;
  expectedRecoverableValueInr: number;
  baselineValueInr: number;
  modelledUpliftInr: number;
  confidence: number;
  reasons: string[];
  costBreakdown: Record<string, unknown>;
  engineVersion: string;
  modelVersions: Record<string, unknown>;
  featureSnapshot: unknown;
  dataProvenance: Record<string, unknown>;
  containsSimulatedData: boolean;
}

export interface RecommendationCandidateInput {
  actionCode: RecoveryAction;
  destinationRef: string | null;
  expectedValueInr: number;
  qualityAtSale: number | null;
  exposureHours: number;
  feasible: boolean;
  infeasibleReason: string | null;
  rank: number;
  costs: Record<string, unknown>;
}

/**
 * Persists one recommendation and ALL of its evaluated candidates
 * (task requirement: audit trail, not just the winner) in a single
 * transaction — either the whole decision is recorded, or none of it is.
 */
export async function createRecommendationWithCandidates(
  rec: RecommendationInput,
  candidates: RecommendationCandidateInput[],
) {
  return db.transaction(async (tx) => {
    const [recRow] = await tx
      .insert(recommendation)
      .values({
        batchId: rec.batchId,
        orgId: rec.orgId,
        validUntil: rec.validUntil,
        chosenActionCode: rec.chosenActionCode,
        destinationRef: rec.destinationRef,
        expectedRecoverableValueInr: String(rec.expectedRecoverableValueInr),
        baselineValueInr: String(rec.baselineValueInr),
        modelledUpliftInr: String(rec.modelledUpliftInr),
        confidence: String(rec.confidence),
        reasons: rec.reasons,
        costBreakdown: rec.costBreakdown,
        engineVersion: rec.engineVersion,
        modelVersions: rec.modelVersions,
        featureSnapshot: rec.featureSnapshot as object,
        dataProvenance: rec.dataProvenance,
        containsSimulatedData: rec.containsSimulatedData,
        status: "ISSUED",
      })
      .returning();

    if (candidates.length > 0) {
      await tx.insert(recommendationCandidate).values(
        candidates.map((c) => ({
          recommendationId: recRow.id,
          orgId: rec.orgId,
          actionCode: c.actionCode,
          destinationRef: c.destinationRef,
          expectedValueInr: String(c.expectedValueInr),
          qualityAtSale: c.qualityAtSale !== null ? String(c.qualityAtSale) : null,
          exposureHours: String(c.exposureHours),
          feasible: c.feasible,
          infeasibleReason: c.infeasibleReason,
          rank: c.rank,
          costs: c.costs,
        })),
      );
    }

    return recRow;
  });
}

/**
 * Anything past its valid_until is expired — checked lazily on every read
 * rather than via a background job (no scheduler exists in this build).
 * Only ISSUED rows transition; a recommendation already ACCEPTED/REJECTED/
 * OVERRIDDEN keeps that status even after valid_until passes — an operator
 * decision, once made, isn't retroactively erased by the clock.
 */
async function expireIfStale<T extends { id: string; status: string; validUntil: Date }>(row: T): Promise<T> {
  if (row.status === "ISSUED" && row.validUntil.getTime() < Date.now()) {
    const [updated] = await db
      .update(recommendation)
      .set({ status: "EXPIRED" })
      .where(eq(recommendation.id, row.id))
      .returning();
    return updated as T;
  }
  return row;
}

export async function getLatestRecommendation(batchId: string) {
  const rows = await db
    .select()
    .from(recommendation)
    .where(eq(recommendation.batchId, batchId))
    .orderBy(desc(recommendation.generatedAt))
    .limit(1);
  if (!rows[0]) return null;
  return expireIfStale(rows[0]);
}

export async function getRecommendation(id: string) {
  const rows = await db.select().from(recommendation).where(eq(recommendation.id, id)).limit(1);
  if (!rows[0]) return null;
  return expireIfStale(rows[0]);
}

export type RecommendationStatus = "ISSUED" | "ACCEPTED" | "REJECTED" | "OVERRIDDEN" | "EXPIRED";

/**
 * Guards the transition: only a currently-ISSUED-and-not-stale
 * recommendation can move to ACCEPTED/REJECTED/OVERRIDDEN. Re-checks
 * expiry first so a stale recommendation can't be accepted a beat after
 * its window closed.
 */
export async function transitionRecommendationStatus(id: string, next: Exclude<RecommendationStatus, "ISSUED" | "EXPIRED">) {
  const current = await getRecommendation(id);
  if (!current) throw new Error(`Recommendation ${id} not found`);
  if (current.status !== "ISSUED") {
    throw new Error(`Recommendation ${id} is ${current.status}, not ISSUED — cannot transition to ${next}`);
  }
  const [updated] = await db.update(recommendation).set({ status: next }).where(eq(recommendation.id, id)).returning();
  return updated;
}

export async function listCandidatesForRecommendation(recommendationId: string) {
  return db
    .select()
    .from(recommendationCandidate)
    .where(eq(recommendationCandidate.recommendationId, recommendationId));
}
