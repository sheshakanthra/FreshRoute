/**
 * Real-data analog of src/demo/scenarios/candidatePaths.ts — same six pure
 * evaluator calls evaluateDecision() runs internally, exposed separately so
 * callers (the recommendation-persistence service, MarketPanel) can get the
 * full per-candidate detail (target ids, path-aware RUL, cost breakdown)
 * that DecisionResult's public RankedAction[] doesn't carry. No engine
 * logic here — just the same six-call list evaluateDecision() itself makes.
 */
import {
  evaluateDiscount,
  evaluateDivert,
  evaluateProcess,
  evaluateReroute,
  evaluateSell,
  evaluateStore,
} from "@/domain/engine";
import type { CandidatePath, DecisionContext } from "@/domain/types";

export function getAllCandidatePaths(context: DecisionContext): CandidatePath[] {
  return [
    evaluateSell(context),
    evaluateDiscount(context),
    evaluateDivert(context),
    evaluateReroute(context),
    evaluateStore(context),
    evaluateProcess(context),
  ];
}
