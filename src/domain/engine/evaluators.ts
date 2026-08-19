/**
 * Section 32 / 34 — the six pathway evaluation functions.
 *
 * Each function evaluates one recovery pathway against the full decision
 * context (condition, telemetry, markets, facilities, scenario) and returns
 * a CandidatePath with feasibility, path-aware remaining useful life, and
 * economics computed from that context.
 *
 * Signatures only for now — implementations land in Session 1. No static
 * formulas, no hard-coded winners.
 */

import type { DecisionContext } from "../types/decision";
import type { CandidatePath } from "../types/models";

export function evaluateSell(context: DecisionContext): CandidatePath {
  throw new Error("evaluateSell: not implemented — Session 1");
}

export function evaluateDiscount(context: DecisionContext): CandidatePath {
  throw new Error("evaluateDiscount: not implemented — Session 1");
}

export function evaluateDivert(context: DecisionContext): CandidatePath {
  throw new Error("evaluateDivert: not implemented — Session 1");
}

export function evaluateReroute(context: DecisionContext): CandidatePath {
  throw new Error("evaluateReroute: not implemented — Session 1");
}

export function evaluateStore(context: DecisionContext): CandidatePath {
  throw new Error("evaluateStore: not implemented — Session 1");
}

export function evaluateProcess(context: DecisionContext): CandidatePath {
  throw new Error("evaluateProcess: not implemented — Session 1");
}
