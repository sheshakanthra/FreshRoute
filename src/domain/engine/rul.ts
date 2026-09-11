/**
 * Section 34 — path-aware remaining useful life.
 *
 * RUL is computed fresh for every candidate through hold -> transit -> market
 * dwell, each stage decaying at a rate appropriate to its environment. There
 * is no single immutable batch RUL reused across pathways.
 */

import type { BatchCondition } from "../types/enums";
import type { PathAwareRul } from "../types/models";
import {
  BASE_SHELF_LIFE_HOURS,
  CONDITION_RUL_MULTIPLIER,
  THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR,
} from "./constants";

/** The batch's remaining useful life at the decision moment, before any candidate path is applied. */
export function computeCurrentRemainingUsefulLifeHours(
  condition: BatchCondition,
  thermalExposureHours: number,
): number {
  return (
    BASE_SHELF_LIFE_HOURS * CONDITION_RUL_MULTIPLIER[condition] -
    thermalExposureHours * THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR
  );
}

/**
 * Standard Q10 temperature-coefficient law: rate(T) = rate(Tref) x
 * Q10^((T - Tref) / 10). At T == referenceTempC the multiplier is exactly 1
 * — no change from the flat, pre-Q10 per-hour treatment. Above it, the
 * multiplier grows exponentially with how far above reference the reading
 * runs; below it, the multiplier shrinks towards 0.
 *
 * This is a RESPIRATION-RATE law: it describes how a climacteric fruit's
 * metabolic (and therefore quality-loss) rate scales with temperature
 * WITHIN the normal physiological range. It says nothing about chilling
 * injury (tissue damage from cold stress) — a different failure mode
 * entirely, governed by a threshold, not a smooth rate curve. Applying this
 * formula below a chilling threshold would claim "colder is ever more
 * protective, without bound," which is physically backwards once chilling
 * injury sets in. Callers are responsible for only invoking this on the
 * warm side of any chilling threshold that applies — see
 * src/server/assessment/computeConditionAssessment.ts, the one real caller,
 * for where that line is drawn.
 */
export interface Q10ScalingParams {
  /** The temperature (deg C) at which the multiplier is defined to be 1 — the commodity's own optimal/reference storage temperature, not an arbitrary constant. */
  referenceTempC: number;
  /** The commodity's sourced Q10 coefficient (dimensionless). */
  q10: number;
}

export function computeQ10RateMultiplier(temperatureC: number, params: Q10ScalingParams): number {
  return Math.pow(params.q10, (temperatureC - params.referenceTempC) / 10);
}

export interface PathTimelineInput {
  holdHours: number;
  holdDecayMultiplier: number;
  transitHours: number;
  transitDecayMultiplier: number;
  marketDwellHours: number;
}

export function computePathAwareRul(
  currentRemainingUsefulLifeHours: number,
  timeline: PathTimelineInput,
): PathAwareRul {
  const consumedHours =
    timeline.holdHours * timeline.holdDecayMultiplier +
    timeline.transitHours * timeline.transitDecayMultiplier +
    timeline.marketDwellHours;

  return {
    holdHours: timeline.holdHours,
    transitHours: timeline.transitHours,
    marketDwellHours: timeline.marketDwellHours,
    resultingUsefulLifeHours: currentRemainingUsefulLifeHours - consumedHours,
  };
}
