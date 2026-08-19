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
