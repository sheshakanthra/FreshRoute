/**
 * Session 1 gate script — NOT shipped UI.
 *
 * Runs the deterministic engine against the three curated scenarios plus the
 * extreme no-feasible-pathway case, prints ranked candidates and margins, and
 * verifies determinism by running each scenario twice.
 */

import { evaluateDecision } from "../src/domain/engine/evaluateDecision";
import type { DecisionResult } from "../src/domain/types/decision";
import type { Scenario } from "../src/domain/types/models";
import { buildDecisionContext } from "../src/demo/scenarios/buildContext";
import {
  CURATED_SCENARIOS,
  SCENARIO_EXTREME_NO_FEASIBLE_PATHWAY,
} from "../src/demo/scenarios/presets";

const EXPECTED_WINNERS: Record<string, string> = {
  "scenario-01-stable-shipment": "SELL",
  "scenario-02-thermal-exposure": "DIVERT",
  "scenario-03-market-shift": "REROUTE",
};

function printResult(scenario: Scenario, result: DecisionResult): void {
  console.log(`\n=== ${scenario.name} (${scenario.id}) ===`);
  console.log(
    `inputs: thermal=${scenario.thermalExposureHours}h delay=${scenario.transitDelayHours}h market=${scenario.marketStrength} condition=${scenario.batchCondition} rerouteAssumption=${scenario.rerouteValidationAssumptionEnabled}`,
  );
  console.log(`recommendedAction: ${result.recommendedAction ?? "NONE"}`);
  console.log(`marginStatus: ${result.marginStatus}  decisionMarginPct: ${result.decisionMarginPct}`);
  console.log(`baselineValue: ${result.baselineValue.toFixed(2)}  recommendedValue: ${result.recommendedValue ?? "null"}  modelledUplift: ${result.modelledUplift ?? "null"}`);
  console.log("ranked candidates:");
  for (const c of result.rankedCandidates) {
    console.log(
      `  #${c.rank || "-"} ${c.action.padEnd(8)} feasible=${String(c.feasible).padEnd(5)} evidence=${c.evidenceTier.padEnd(19)} expectedRecovery=${c.expectedRecovery.toFixed(2).padStart(10)}  risk=${c.riskLevel}${c.feasibilityReason ? `  reason="${c.feasibilityReason}"` : ""}`,
    );
  }
  console.log("reasons:");
  result.reasons.forEach((r) => console.log(`  - ${r}`));
  if (result.assumptionFlags.length > 0) {
    console.log("assumptionFlags:");
    result.assumptionFlags.forEach((a) => console.log(`  - ${a}`));
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

function hasNaNOrUndefined(result: DecisionResult): boolean {
  const numbers = [result.baselineValue, result.recommendedValue, result.modelledUplift, result.decisionMarginPct];
  if (numbers.some((n) => n !== null && Number.isNaN(n))) return true;
  for (const c of result.rankedCandidates) {
    if (Number.isNaN(c.expectedRecovery) || Number.isNaN(c.cost) || Number.isNaN(c.score)) return true;
  }
  return false;
}

console.log("################################################################");
console.log("# FreshRoute engine — curated scenario verification");
console.log("################################################################");

let allPassed = true;

for (const scenario of CURATED_SCENARIOS) {
  const context = buildDecisionContext(scenario);
  const result = evaluateDecision(context);
  printResult(scenario, result);

  const expectedWinner = EXPECTED_WINNERS[scenario.id];
  const winnerOk = result.recommendedAction === expectedWinner;
  assert(winnerOk, `${scenario.name} → recommends ${expectedWinner}`);
  if (!winnerOk) allPassed = false;

  const marginOk = (result.decisionMarginPct ?? 0) >= 8;
  assert(marginOk, `${scenario.name} → margin ≥ 8% (actual: ${result.decisionMarginPct}%)`);
  if (!marginOk) allPassed = false;

  const clean = !hasNaNOrUndefined(result);
  assert(clean, `${scenario.name} → no NaN / undefined in result`);
  if (!clean) allPassed = false;

  // Determinism: run twice, compare.
  const result2 = evaluateDecision(buildDecisionContext(scenario));
  const deterministic = JSON.stringify(result) === JSON.stringify(result2);
  assert(deterministic, `${scenario.name} → deterministic (same input -> same output)`);
  if (!deterministic) allPassed = false;
}

console.log("\n################################################################");
console.log("# Extreme case — no feasible pathway");
console.log("################################################################");

const extremeContext = buildDecisionContext(SCENARIO_EXTREME_NO_FEASIBLE_PATHWAY);
const extremeResult = evaluateDecision(extremeContext);
printResult(SCENARIO_EXTREME_NO_FEASIBLE_PATHWAY, extremeResult);

const noFeasible = extremeResult.marginStatus === "NO_FEASIBLE_PATHWAY" && extremeResult.recommendedAction === null;
assert(noFeasible, "extreme case → NO_FEASIBLE_PATHWAY with null recommendedAction");
if (!noFeasible) allPassed = false;

const allSixInfeasible = extremeResult.feasibilityResults.every((f) => !f.feasible);
assert(allSixInfeasible, "extreme case → all six pathways infeasible");
if (!allSixInfeasible) allPassed = false;

const extremeClean = !hasNaNOrUndefined(extremeResult);
assert(extremeClean, "extreme case → no NaN / undefined in result");
if (!extremeClean) allPassed = false;

const extremeResult2 = evaluateDecision(buildDecisionContext(SCENARIO_EXTREME_NO_FEASIBLE_PATHWAY));
const extremeDeterministic = JSON.stringify(extremeResult) === JSON.stringify(extremeResult2);
assert(extremeDeterministic, "extreme case → deterministic");
if (!extremeDeterministic) allPassed = false;

console.log("\n################################################################");
console.log(allPassed ? "# ALL CHECKS PASSED" : "# SOME CHECKS FAILED");
console.log("################################################################");

if (!allPassed) process.exitCode = 1;
