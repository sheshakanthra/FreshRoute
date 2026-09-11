import { computeCurrentRemainingUsefulLifeHours, evaluateDecision } from "../../domain/engine";
import type { Batch, BatchStatus, CandidatePath, DecisionContext, DecisionResult } from "../../domain/types";
import { batches } from "../data/batches";
import { markets } from "../data/markets";
import { buildDecisionContext, deriveCurrentStateScenario } from "./buildContext";
import { getCandidatePaths } from "./candidatePaths";
import { computeDisplayStatus } from "./displayStatus";

export interface BatchViewData {
  batch: Batch;
  context: DecisionContext;
  decision: DecisionResult;
  candidates: CandidatePath[];
  currentRemainingUsefulLifeHours: number;
  /** Continuous 0-100 score — see RealBatchBaseline.qualityScore in
   * domain-adapters/buildRealDecisionContext.ts for why this lives outside
   * Batch (the engine only ever takes the banded condition, never the
   * number). The demo path below has no real continuous score to report —
   * bandMidpointQualityScore approximates one from the demo batch's own
   * categorical condition so the type stays non-optional for every
   * consumer, flagged as an approximation rather than left silently wrong. */
  qualityScore: number;
  destinationMarketName: string;
  displayStatus: BatchStatus;
}

/** Demo-only approximation — the demo layer never computed a continuous
 * score, only the categorical band. Representative midpoints of each band,
 * not a measurement. Real batches never call this; buildRealBatchBaseline
 * (D3) always carries a genuine condition_assessment.quality_score. */
function bandMidpointQualityScore(condition: Batch["condition"]): number {
  if (condition === "HEALTHY") return 90;
  if (condition === "MODERATE") return 55;
  return 20;
}

/** Section 10 — assembles everything the batch command view needs, all sourced from evaluateDecision() and its inputs. */
export function getBatchViewData(batchId: string): BatchViewData | undefined {
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) return undefined;

  const scenario = deriveCurrentStateScenario(batch);
  const context = buildDecisionContext(batch, scenario);
  const decision = evaluateDecision(context);
  const candidates = getCandidatePaths(context);
  const currentRemainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(
    batch.condition,
    batch.telemetry.thermalExposureHours,
  );
  const destinationMarket = markets.find((m) => m.id === batch.plannedMarketId);

  return {
    batch: context.batch,
    context,
    decision,
    candidates,
    currentRemainingUsefulLifeHours,
    qualityScore: bandMidpointQualityScore(batch.condition),
    destinationMarketName: destinationMarket?.name ?? "Unknown market",
    displayStatus: computeDisplayStatus(batch, decision),
  };
}
