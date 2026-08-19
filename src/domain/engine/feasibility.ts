/**
 * Section 14 — feasibility is a hard filter, evaluated before ranking.
 */

import type { RecoveryAction } from "../types/enums";
import { FEASIBILITY_MIN_RUL_HOURS } from "./constants";

export interface FeasibilityCheckResult {
  feasible: boolean;
  reason?: string;
}

export function checkRulFeasibility(action: RecoveryAction, resultingUsefulLifeHours: number): FeasibilityCheckResult {
  const threshold = FEASIBILITY_MIN_RUL_HOURS[action];
  if (resultingUsefulLifeHours <= threshold) {
    return {
      feasible: false,
      reason: `Remaining useful life on this route (${resultingUsefulLifeHours.toFixed(1)}h) falls below the ${action} viability threshold (${threshold}h).`,
    };
  }
  return { feasible: true };
}
