/**
 * Section 32 — the engine's single entry point.
 *
 * Pipeline (Section 14): raw inputs -> six pathway evaluations (each its own
 * feasibility + path-aware RUL + economics) -> ranking of feasible
 * candidates -> narrow-margin policy -> recommendation assembly.
 */

import type { DecisionContext, DecisionResult } from "../types/decision";
import { DATA_PROVENANCE } from "./constants";
import { evaluateDiscount, evaluateDivert, evaluateProcess, evaluateReroute, evaluateSell, evaluateStore } from "./evaluators";
import { evaluateMargin, rankCandidates } from "./ranking";
import { buildReasons } from "./reasons";

export function evaluateDecision(context: DecisionContext): DecisionResult {
  const candidates = [
    evaluateSell(context),
    evaluateDiscount(context),
    evaluateDivert(context),
    evaluateReroute(context),
    evaluateStore(context),
    evaluateProcess(context),
  ];

  const baselineCandidate = candidates.find((c) => c.action === context.batch.currentPlanAction) ?? candidates[0];
  const baselineValue = Number(baselineCandidate.expectedRecovery.toFixed(2));

  const rankedCandidates = rankCandidates(candidates);
  const feasibleRankedAsc = rankedCandidates.filter((c) => c.feasible).sort((a, b) => a.rank - b.rank);

  const { marginStatus, decisionMarginPct } = evaluateMargin(feasibleRankedAsc);

  const feasibilityResults = candidates.map((c) => ({
    action: c.action,
    feasible: c.feasibility === "FEASIBLE",
    reason: c.feasibilityReason,
  }));

  if (feasibleRankedAsc.length === 0) {
    return {
      recommendedAction: null,
      baselineValue,
      recommendedValue: null,
      modelledUplift: null,
      rankedCandidates,
      feasibilityResults,
      reasons: [],
      assumptionFlags: [],
      confidenceStatus: "SIMULATION-LIMITED",
      engineVersion: context.engineVersion,
      dataProvenance: DATA_PROVENANCE,
      marginStatus,
      decisionMarginPct,
    };
  }

  const winnerRanked = feasibleRankedAsc[0];
  const winnerCandidate = candidates.find((c) => c.action === winnerRanked.action)!;
  const recommendedValue = Number(winnerCandidate.expectedRecovery.toFixed(2));
  const modelledUplift = Number((recommendedValue - baselineValue).toFixed(2));

  const reasons = buildReasons({ context, winner: winnerCandidate, baseline: baselineCandidate });

  return {
    recommendedAction: winnerCandidate.action,
    baselineValue,
    recommendedValue,
    modelledUplift,
    rankedCandidates,
    feasibilityResults,
    reasons,
    assumptionFlags: winnerCandidate.assumptionFlags,
    confidenceStatus: "SIMULATION-LIMITED",
    engineVersion: context.engineVersion,
    dataProvenance: DATA_PROVENANCE,
    marginStatus,
    decisionMarginPct,
  };
}
