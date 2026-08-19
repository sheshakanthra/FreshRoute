/**
 * Section 32 — the engine's single entry point.
 *
 * Pipeline (Section 14): raw inputs -> feasibility filter -> candidate
 * pathways -> value calculation -> risk adjustment -> ranking -> narrow-
 * margin policy -> recommendation. Implemented in Session 1.
 */

import type { DecisionContext, DecisionResult } from "../types/decision";

export function evaluateDecision(context: DecisionContext): DecisionResult {
  throw new Error("evaluateDecision: not implemented — Session 1");
}
