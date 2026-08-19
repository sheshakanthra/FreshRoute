import {
  evaluateDiscount,
  evaluateDivert,
  evaluateProcess,
  evaluateReroute,
  evaluateSell,
  evaluateStore,
} from "../../domain/engine";
import type { CandidatePath } from "../../domain/types";
import type { DecisionContext } from "../../domain/types";

/**
 * Re-runs the same six pure evaluators evaluateDecision() uses internally,
 * for UI surfaces (MarketPanel) that need the richer per-candidate detail
 * (target market/facility ids, path-aware RUL) that DecisionResult's public
 * RankedAction[] intentionally doesn't carry. Same context in -> identical
 * candidates out, so recomputing is cheap and side-effect free.
 */
export function getCandidatePaths(context: DecisionContext): CandidatePath[] {
  return [
    evaluateSell(context),
    evaluateDiscount(context),
    evaluateDivert(context),
    evaluateReroute(context),
    evaluateStore(context),
    evaluateProcess(context),
  ];
}
