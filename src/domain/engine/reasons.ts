/**
 * Section 16 — the recommendation's three computed reasons.
 *
 * Every reason is derived from the winner's and baseline's actual computed
 * figures (RUL preserved, market signal, economic delta) — never templated
 * per scenario or hard-coded per action.
 */

import type { DecisionContext } from "../types/decision";
import type { CandidatePath } from "../types/models";

export function buildReasons(input: {
  context: DecisionContext;
  winner: CandidatePath;
  baseline: CandidatePath;
}): string[] {
  const { context, winner, baseline } = input;
  const reasons: string[] = [];

  reasons.push(
    `${winner.action} preserves ${winner.pathAwareRul.resultingUsefulLifeHours.toFixed(1)}h of remaining useful life, versus ${baseline.pathAwareRul.resultingUsefulLifeHours.toFixed(1)}h for the current plan.`,
  );

  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === context.batch.plannedMarketId);
  if (plannedSnapshot) {
    reasons.push(
      `Planned market demand is ${plannedSnapshot.demandSignal.toLowerCase()}, pricing at ₹${plannedSnapshot.pricePerKg.toFixed(2)}/kg indicative.`,
    );
  }

  const upliftPct =
    baseline.expectedRecovery !== 0
      ? ((winner.expectedRecovery - baseline.expectedRecovery) / Math.abs(baseline.expectedRecovery)) * 100
      : 0;
  reasons.push(
    `${winner.action} yields an expected recovery of ₹${winner.expectedRecovery.toFixed(0)} versus ₹${baseline.expectedRecovery.toFixed(0)} for the current plan (${upliftPct >= 0 ? "+" : ""}${upliftPct.toFixed(1)}%).`,
  );

  return reasons.slice(0, 3);
}
