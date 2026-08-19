/**
 * Section 13 / 22 / 23 — ranking and the narrow-margin policy.
 *
 * Feasibility is already decided per candidate before this module runs.
 * Infeasible candidates are carried through (rank 0) so the UI can render
 * all six pathways, but they never factor into the winner or the margin.
 */

import type { RiskLevel, MarginStatus } from "../types/enums";
import type { RankedAction } from "../types/decision";
import type { CandidatePath } from "../types/models";
import { NARROW_MARGIN_THRESHOLD_PCT } from "./constants";

function riskLevelForCandidate(candidate: CandidatePath): RiskLevel {
  const grossValue = Math.max(1, candidate.saleableKg * candidate.realizablePricePerKg);
  const riskRatio = candidate.riskAdjustment / grossValue;
  if (riskRatio >= 0.06) return "HIGH";
  if (riskRatio >= 0.03) return "MODERATE";
  return "LOW";
}

export function rankCandidates(candidates: CandidatePath[]): RankedAction[] {
  const feasibleSortedDesc = candidates
    .filter((c) => c.feasibility === "FEASIBLE")
    .sort((a, b) => b.expectedRecovery - a.expectedRecovery);

  const rankByAction = new Map(feasibleSortedDesc.map((c, index) => [c.action, index + 1]));

  const ranked = candidates.map<RankedAction>((c) => ({
    action: c.action,
    expectedRecovery: c.expectedRecovery,
    cost: c.transportCost + c.handlingCost + c.storageCost + c.processingCost,
    riskLevel: riskLevelForCandidate(c),
    evidenceTier: c.evidenceTier,
    feasible: c.feasibility === "FEASIBLE",
    feasibilityReason: c.feasibilityReason,
    score: c.expectedRecovery,
    rank: rankByAction.get(c.action) ?? 0,
  }));

  return ranked.sort((a, b) => {
    if (a.rank === 0 && b.rank === 0) return 0;
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    return a.rank - b.rank;
  });
}

export interface MarginEvaluation {
  marginStatus: MarginStatus;
  decisionMarginPct: number | null;
}

/** Section 23 — narrow-margin policy; Section 15 — the no-feasible-pathway safe state. */
export function evaluateMargin(feasibleRankedAsc: RankedAction[]): MarginEvaluation {
  if (feasibleRankedAsc.length === 0) {
    return { marginStatus: "NO_FEASIBLE_PATHWAY", decisionMarginPct: null };
  }
  if (feasibleRankedAsc.length === 1) {
    return { marginStatus: "CLEAR", decisionMarginPct: null };
  }

  const [winner, runnerUp] = feasibleRankedAsc;
  const base = Math.abs(runnerUp.expectedRecovery) || Math.abs(winner.expectedRecovery) || 1;
  const marginPct = ((winner.expectedRecovery - runnerUp.expectedRecovery) / base) * 100;

  return {
    marginStatus: marginPct < NARROW_MARGIN_THRESHOLD_PCT ? "NARROW" : "CLEAR",
    decisionMarginPct: Number(marginPct.toFixed(2)),
  };
}
