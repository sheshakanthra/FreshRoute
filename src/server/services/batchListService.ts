import "server-only";
import { evaluateDecision, computeCurrentRemainingUsefulLifeHours } from "@/domain/engine";
import { buildRealDecisionContext, deriveBaselineScenario } from "@/domain-adapters/buildRealDecisionContext";
import { computeDisplayStatus } from "@/demo/scenarios/displayStatus";
import type { Batch, BatchStatus, DecisionResult } from "@/domain/types";
import { listBatches } from "../repositories/batches";
import { getDefaultOrganization } from "../repositories/organizations";
import { buildRealBatchBaseline } from "../context/buildRealBatchBaseline";
import type { RecommendationOutcomeRow } from "../repositories/recommendationOutcomes";

export interface RealBatchDashboardEntry {
  batch: Batch;
  decision: DecisionResult;
  currentRemainingUsefulLifeHours: number;
  destinationMarketName: string;
  grossPlannedValue: number;
  displayStatus: BatchStatus;
}

/**
 * Task 1/2/7: replaces src/demo/scenarios/dashboardDecisions.ts's
 * getBatchDashboardEntries() as the source for /dashboard, /batches and
 * /decisions — same shape, real data. Runs each real batch through the
 * UNCHANGED evaluateDecision() using its own current (no-override) state;
 * nothing here is persisted — this is read-only display, same as the demo
 * version always was. Persistence only happens via generateRecommendationAction.
 */
export async function getRealBatchDashboardEntries(): Promise<RealBatchDashboardEntry[]> {
  const org = await getDefaultOrganization();
  const rows = await listBatches(org.id);

  const entries = await Promise.all(
    rows.map(async (row): Promise<RealBatchDashboardEntry | null> => {
      const baseline = await buildRealBatchBaseline(row.id);
      if (!baseline) return null;

      const scenario = deriveBaselineScenario(baseline);
      const context = buildRealDecisionContext(baseline, scenario);
      const decision = evaluateDecision(context);
      const currentRemainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(
        scenario.batchCondition,
        scenario.thermalExposureHours,
      );
      const plannedMarket = baseline.markets.find((m) => m.id === baseline.plannedMarketId);
      const grossPlannedValue = plannedMarket?.latestPrice
        ? baseline.quantityKg * plannedMarket.latestPrice.modalPriceInrPerKg
        : 0;

      return {
        batch: context.batch,
        decision,
        currentRemainingUsefulLifeHours,
        destinationMarketName: plannedMarket?.name ?? "Unknown market",
        grossPlannedValue,
        displayStatus: computeDisplayStatus(context.batch, decision),
      };
    }),
  );

  return entries.filter((e): e is RealBatchDashboardEntry => e !== null);
}

export interface DashboardKpis {
  activeBatches: number;
  atRiskBatches: number;
  potentialValueAtRisk: number;
  recommendationsIssuedToday: number;
}

export function computeDashboardKpis(entries: RealBatchDashboardEntry[]): DashboardKpis {
  const atRisk = entries.filter((e) => e.displayStatus === "AT_RISK");
  return {
    activeBatches: entries.length,
    atRiskBatches: atRisk.length,
    potentialValueAtRisk: atRisk.reduce((sum, e) => sum + e.grossPlannedValue, 0),
    recommendationsIssuedToday: entries.filter((e) => e.decision.recommendedAction !== null).length,
  };
}

export interface OutcomeKpis {
  valueRecoveredInr: number;
  recordedLossKg: number;
  outcomeCount: number;
}

/**
 * Section 5 — "Value recovered" / recorded-loss KPIs. Deliberately named
 * "Recorded loss," not "Spoilage avoided": an avoided-% figure would need a
 * baseline-vs-actual spoilage comparison that doesn't exist anywhere in
 * economics.ts (the assessment flags that specific computation as D, out of
 * scope) — this is a plain sum of the real, already-persisted
 * outcome_record.realized_loss_kg values, nothing derived or compared.
 */
export function computeOutcomeKpis(outcomeRows: RecommendationOutcomeRow[]): OutcomeKpis {
  const withOutcome = outcomeRows.filter((r) => r.outcome_record_id !== null);
  return {
    valueRecoveredInr: withOutcome.reduce((sum, r) => sum + Number(r.realized_value_inr ?? 0), 0),
    recordedLossKg: withOutcome.reduce((sum, r) => sum + Number(r.realized_loss_kg ?? 0), 0),
    outcomeCount: withOutcome.length,
  };
}
