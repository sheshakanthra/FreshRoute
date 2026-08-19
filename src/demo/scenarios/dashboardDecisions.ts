import { computeCurrentRemainingUsefulLifeHours, evaluateDecision } from "../../domain/engine";
import type { Batch, BatchStatus, DecisionResult } from "../../domain/types";
import { batches } from "../data/batches";
import { markets, MARKET_BASE_PRICE_PER_KG } from "../data/markets";
import { buildDecisionContext, deriveCurrentStateScenario } from "./buildContext";

export interface BatchDashboardEntry {
  batch: Batch;
  decision: DecisionResult;
  currentRemainingUsefulLifeHours: number;
  destinationMarketName: string;
  /** quantityKg × the planned market's indicative base price — the batch's full value before cost/spoilage. */
  grossPlannedValue: number;
  /** Section 9 — the batch's visual state, computed fresh from the engine's own output. */
  displayStatus: BatchStatus;
}

function computeDisplayStatus(batch: Batch, decision: DecisionResult): BatchStatus {
  if (decision.marginStatus === "NO_FEASIBLE_PATHWAY") return "AT_RISK";
  if (decision.assumptionFlags.length > 0) return "ASSUMPTION_FLAGGED";
  if (decision.recommendedAction !== batch.currentPlanAction) return "DECISION_REQUIRED";
  return "NORMAL";
}

/** Section 9 — runs every active batch through the engine using its own current state (no scenario override). */
export function getBatchDashboardEntries(): BatchDashboardEntry[] {
  return batches.map((batch) => {
    const scenario = deriveCurrentStateScenario(batch);
    const context = buildDecisionContext(batch, scenario);
    const decision = evaluateDecision(context);
    const currentRemainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(
      batch.condition,
      batch.telemetry.thermalExposureHours,
    );
    const destinationMarket = markets.find((m) => m.id === batch.plannedMarketId);
    const basePricePerKg = MARKET_BASE_PRICE_PER_KG[batch.plannedMarketId] ?? 0;

    return {
      batch,
      decision,
      currentRemainingUsefulLifeHours,
      destinationMarketName: destinationMarket?.name ?? "Unknown market",
      grossPlannedValue: batch.quantityKg * basePricePerKg,
      displayStatus: computeDisplayStatus(batch, decision),
    };
  });
}

export interface DashboardKpis {
  activeBatches: number;
  atRiskBatches: number;
  potentialValueAtRisk: number;
  recommendationsIssuedToday: number;
}

/** Section 9 — the four top KPIs, all computed from the same per-batch entries the table renders. */
export function computeDashboardKpis(entries: BatchDashboardEntry[]): DashboardKpis {
  const atRisk = entries.filter((entry) => entry.displayStatus === "AT_RISK");

  return {
    activeBatches: entries.length,
    atRiskBatches: atRisk.length,
    potentialValueAtRisk: atRisk.reduce((sum, entry) => sum + entry.grossPlannedValue, 0),
    recommendationsIssuedToday: entries.filter((entry) => entry.decision.recommendedAction !== null).length,
  };
}
