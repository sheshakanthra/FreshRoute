import "server-only";
import { evaluateDecision, computeCurrentRemainingUsefulLifeHours } from "@/domain/engine";
import { computeQualityFactor } from "@/domain/engine";
import { buildRealDecisionContext, deriveBaselineScenario } from "@/domain-adapters/buildRealDecisionContext";
import { getAllCandidatePaths } from "@/domain-adapters/getAllCandidatePaths";
import type { Scenario } from "@/domain/types";
import { buildRealBatchBaseline } from "../context/buildRealBatchBaseline";
import { createRecommendationWithCandidates } from "../repositories/recommendations";

const VALID_FOR_HOURS = 6;

/**
 * Task 6: confidence is a transparent, rule-based indicator — NOT a
 * calibrated ML probability (the engine's own confidenceStatus stays
 * "SIMULATION-LIMITED" regardless; this numeric value exists only because
 * the recommendation table has a confidence column for future backtesting).
 * Starts at a fixed anchor and is reduced for concrete, named reasons, each
 * of which is also surfaced in the reasons text shown to the user.
 */
function computeConfidence(input: {
  evidenceTier: "VERIFIED" | "PLAUSIBLE_UNVERIFIED";
  demandSourceAbsent: boolean;
  marginStatus: "CLEAR" | "NARROW" | "NO_FEASIBLE_PATHWAY";
}): { confidence: number; extraReasons: string[] } {
  let confidence = 0.6;
  const extraReasons: string[] = [];

  if (input.demandSourceAbsent) {
    confidence -= 0.15;
    extraReasons.push(
      "No arrivals/demand data exists for the destination market (confirmed unavailable at the source) — confidence reduced.",
    );
  }
  if (input.evidenceTier === "PLAUSIBLE_UNVERIFIED") {
    confidence -= 0.15;
    extraReasons.push("This pathway is plausible but not field-verified — confidence reduced.");
  }
  if (input.marginStatus === "NARROW") {
    confidence -= 0.1;
    extraReasons.push("Top pathways are economically close (narrow margin) — confidence reduced.");
  }

  return { confidence: Math.max(0.1, Math.min(0.9, confidence)), extraReasons };
}

export async function generateAndPersistRecommendation(batchId: string, orgId: string, scenarioOverride?: Partial<Scenario>) {
  const baseline = await buildRealBatchBaseline(batchId);
  if (!baseline) throw new Error(`Could not build a real decision context for batch ${batchId}`);

  const scenario: Scenario = { ...deriveBaselineScenario(baseline), ...scenarioOverride };
  const context = buildRealDecisionContext(baseline, scenario);

  const decision = evaluateDecision(context); // UNCHANGED engine
  const allCandidates = getAllCandidatePaths(context); // same six pure evaluators, full detail

  const plannedMarket = baseline.markets.find((m) => m.id === baseline.plannedMarketId);
  const demandSourceAbsent = plannedMarket?.latestPrice?.demandSourceAbsent ?? true;

  const winner = decision.recommendedAction
    ? allCandidates.find((c) => c.action === decision.recommendedAction)
    : null;

  const { confidence, extraReasons } = computeConfidence({
    evidenceTier: winner?.evidenceTier ?? "VERIFIED",
    demandSourceAbsent,
    marginStatus: decision.marginStatus,
  });

  const reasons = [...decision.reasons, ...extraReasons];

  const anyLogisticsSynthetic = baseline.markets.some((m) => m.logisticsAreIndicative) || baseline.facilities.length === 0;
  const dataProvenance = {
    batch: "REAL",
    telemetry: "REAL",
    marketPrices: Object.fromEntries(
      baseline.markets.map((m) => [m.id, m.latestPrice ? "REAL" : "SYNTHETIC"]),
    ),
    logistics: "SYNTHETIC", // distance/eta/transit-cost — no routing data source exists yet
    facilities: baseline.facilities.length === 0 ? "ABSENT (no rows)" : "SYNTHETIC",
    demandSignal: "SYNTHETIC (no arrivals data exists at any checked source)",
  };

  const currentRul = computeCurrentRemainingUsefulLifeHours(scenario.batchCondition, scenario.thermalExposureHours);

  const candidateRows = allCandidates.map((c) => {
    const ranked = decision.rankedCandidates.find((r) => r.action === c.action);
    return {
      actionCode: c.action,
      destinationRef: c.targetMarketId ?? c.targetFacilityId ?? null,
      expectedValueInr: c.expectedRecovery,
      qualityAtSale: Number((computeQualityFactor(c.pathAwareRul.resultingUsefulLifeHours, currentRul) * 100).toFixed(2)),
      exposureHours: c.pathAwareRul.holdHours + c.pathAwareRul.transitHours + c.pathAwareRul.marketDwellHours,
      feasible: c.feasibility === "FEASIBLE",
      infeasibleReason: c.feasibilityReason ?? null,
      rank: ranked?.rank ?? 0,
      costs: {
        transportCost: c.transportCost,
        handlingCost: c.handlingCost,
        storageCost: c.storageCost,
        processingCost: c.processingCost,
        riskAdjustment: c.riskAdjustment,
      },
    };
  });

  // NO_FEASIBLE_PATHWAY is a real, designed engine outcome (the UI already
  // has a dedicated NoFeasiblePathwayCard for it) — persisted with a null
  // chosen action rather than dropped or forced onto a fake winner.
  const recRow = await createRecommendationWithCandidates(
    {
      batchId,
      orgId,
      validUntil: new Date(Date.now() + VALID_FOR_HOURS * 60 * 60 * 1000),
      chosenActionCode: decision.recommendedAction,
      destinationRef: winner?.targetMarketId ?? winner?.targetFacilityId ?? null,
      expectedRecoverableValueInr: decision.recommendedValue ?? decision.baselineValue,
      baselineValueInr: decision.baselineValue,
      modelledUpliftInr: decision.modelledUplift ?? 0,
      confidence,
      reasons,
      costBreakdown: winner
        ? {
            transportCost: winner.transportCost,
            handlingCost: winner.handlingCost,
            storageCost: winner.storageCost,
            processingCost: winner.processingCost,
            riskAdjustment: winner.riskAdjustment,
          }
        : {},
      engineVersion: context.engineVersion,
      modelVersions: { engine: context.engineVersion, conditionAssessment: "freshroute-condition-heuristic@0.1.0" },
      featureSnapshot: context,
      dataProvenance,
      containsSimulatedData: anyLogisticsSynthetic,
    },
    candidateRows,
  );

  return { recommendation: recRow, decision, context };
}
