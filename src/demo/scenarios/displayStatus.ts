import type { Batch, BatchStatus, DecisionResult } from "../../domain/types";

/** Section 9 — a batch's visual state, computed fresh from the engine's own output rather than hand-authored. */
export function computeDisplayStatus(batch: Batch, decision: DecisionResult): BatchStatus {
  if (decision.marginStatus === "NO_FEASIBLE_PATHWAY") return "AT_RISK";
  if (decision.assumptionFlags.length > 0) return "ASSUMPTION_FLAGGED";
  if (decision.recommendedAction !== batch.currentPlanAction) return "DECISION_REQUIRED";
  return "NORMAL";
}
