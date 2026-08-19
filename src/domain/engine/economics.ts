/**
 * Section 33 — the shared economic model every candidate pathway is scored on.
 */

import { clamp } from "../../lib/calculations/math";
import type { EvidenceTier } from "../types/enums";
import { QUALITY_PRICE_FLOOR_MULTIPLIER, UNVERIFIED_RISK_RATE, VERIFIED_RISK_RATE } from "./constants";

/** How much of the RUL available at decision time this path preserves, in [0, 1]. */
export function computeQualityFactor(
  resultingUsefulLifeHours: number,
  currentRemainingUsefulLifeHours: number,
): number {
  if (currentRemainingUsefulLifeHours <= 0) return 0;
  return clamp(resultingUsefulLifeHours / currentRemainingUsefulLifeHours, 0, 1);
}

/** Buyers pay less for lower-freshness produce; floors out rather than hitting zero. */
export function computeQualityPriceMultiplier(qualityFactor: number): number {
  return QUALITY_PRICE_FLOOR_MULTIPLIER + (1 - QUALITY_PRICE_FLOOR_MULTIPLIER) * qualityFactor;
}

/** Fresh-channel pathways lose saleable kg roughly in line with quality loss. */
export function computeFreshSaleableFraction(qualityFactor: number): number {
  return clamp(qualityFactor, 0, 1);
}

/** Processing tolerates lower freshness than a fresh-channel sale. */
export function computeProcessSaleableFraction(qualityFactor: number): number {
  if (qualityFactor <= 0) return 0;
  return clamp(0.55 + 0.45 * qualityFactor, 0, 1);
}

export function computeRiskAdjustment(input: { grossRecovery: number; evidenceTier: EvidenceTier }): number {
  const rate = input.evidenceTier === "VERIFIED" ? VERIFIED_RISK_RATE : UNVERIFIED_RISK_RATE;
  return Math.max(0, input.grossRecovery) * rate;
}

export interface ExpectedRecoveryInput {
  saleableKg: number;
  realizablePricePerKg: number;
  transportCost: number;
  handlingCost: number;
  storageCost: number;
  processingCost: number;
  riskAdjustment: number;
}

/** Section 33 — expectedRecovery = saleableKg × realizablePrice − transport − handling − storage − processing − risk. */
export function computeExpectedRecovery(input: ExpectedRecoveryInput): number {
  return (
    input.saleableKg * input.realizablePricePerKg -
    input.transportCost -
    input.handlingCost -
    input.storageCost -
    input.processingCost -
    input.riskAdjustment
  );
}
