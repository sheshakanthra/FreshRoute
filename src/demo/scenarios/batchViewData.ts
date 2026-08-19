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
  destinationMarketName: string;
  displayStatus: BatchStatus;
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
    destinationMarketName: destinationMarket?.name ?? "Unknown market",
    displayStatus: computeDisplayStatus(batch, decision),
  };
}
