import "server-only";
import { createActionExecution } from "../repositories/actionExecutions";
import { getRecommendation, transitionRecommendationStatus } from "../repositories/recommendations";
import type { RecoveryAction } from "@/domain/types";

/** No auth layer exists yet — every write in this build is attributed to
 * this fixed placeholder identity rather than inventing a fake login. */
export const PLACEHOLDER_OPERATOR_IDENTITY = "operator@freshroute.local (no auth configured)";

/**
 * Accept: the operator did exactly what the system recommended. Requires a
 * chosen_action_code to exist — a NO_FEASIBLE_PATHWAY recommendation (null
 * chosen action) has nothing to accept; there is no action to execute.
 */
export async function acceptRecommendation(recommendationId: string, orgId: string, notes?: string) {
  const rec = await getRecommendation(recommendationId);
  if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
  if (!rec.chosenActionCode) {
    throw new Error("This recommendation has no feasible pathway — there is nothing to accept.");
  }

  const execution = await createActionExecution({
    recommendationId,
    orgId,
    executedActionCode: rec.chosenActionCode as RecoveryAction,
    executedBy: PLACEHOLDER_OPERATOR_IDENTITY,
    notes: notes ?? null,
  });
  const updated = await transitionRecommendationStatus(recommendationId, "ACCEPTED");
  return { execution, recommendation: updated };
}

/**
 * Reject: the operator declined the recommendation. Deliberately does NOT
 * write an action_execution row — that table means "what action was
 * executed," and a bare rejection with no replacement action specified has
 * nothing to record there. If the operator later says what they actually
 * did, that's an Override, not a Reject.
 */
export async function rejectRecommendation(recommendationId: string, notes?: string) {
  void notes; // no dedicated free-text column on recommendation for this; recorded via outcome_record.notes if the operator records an outcome later
  const updated = await transitionRecommendationStatus(recommendationId, "REJECTED");
  return { recommendation: updated };
}

/** Override: the operator did something OTHER than the recommended action.
 * The replacement action must be a real action_type.code — never free text
 * (task requirement) — enforced both by the UI (a <select> populated from
 * action_type) and by the DB's own FK on action_execution.executed_action_code. */
export async function overrideRecommendation(
  recommendationId: string,
  orgId: string,
  executedActionCode: RecoveryAction,
  notes?: string,
) {
  const rec = await getRecommendation(recommendationId);
  if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);

  const execution = await createActionExecution({
    recommendationId,
    orgId,
    executedActionCode,
    executedBy: PLACEHOLDER_OPERATOR_IDENTITY,
    notes: notes ?? null,
  });
  const updated = await transitionRecommendationStatus(recommendationId, "OVERRIDDEN");
  return { execution, recommendation: updated };
}
