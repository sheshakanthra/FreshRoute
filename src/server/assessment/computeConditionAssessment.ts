/**
 * D3 — bridges real telemetry to the decision engine's existing, UNCHANGED
 * input shape. The engine takes a categorical BatchCondition + a single
 * thermalExposureHours number (domain/engine/rul.ts,
 * computeCurrentRemainingUsefulLifeHours) — it does not know about
 * condition_assessment or quality_score at all, and this file does not
 * change that. It only computes, from real telemetry, the two values the
 * engine has always expected, plus a continuous quality_score for the
 * condition_assessment row the schema wants (STAGE0: "model outputs...
 * live in condition_assessment").
 *
 * This is intentionally a simple, transparent, documented heuristic — not a
 * calibrated model. It is explicitly out of domain/engine (no engine file
 * imports this, and this file only imports pure, unmodified engine
 * functions to keep the RUL numbers consistent with each other).
 *
 * D-later — Q10 wired in: `thermalExposureHours` below is no longer a plain
 * count of wall-clock hours spent outside the safe band. Each stress hour
 * is now weighted by the commodity's own sourced Q10 coefficient via
 * domain/engine's computeQ10RateMultiplier (see that function's doc for the
 * respiration-rate-law caveat), so a severely hot hour now counts for more
 * than one "exposure hour" and a mildly hot one for barely more than one.
 * The name is kept (it still feeds rul.ts's flat per-hour penalty
 * unchanged, and the DB column is still batch_telemetry.thermal_exposure_hours)
 * but it should now be read as "Q10-weighted effective exposure hours," not
 * literal wall-clock hours. Q10 is applied ONLY on the warm side — see
 * computeQ10Weight below for why the chilling side deliberately keeps the
 * old flat weighting.
 */
import { computeCurrentRemainingUsefulLifeHours, computeQ10RateMultiplier } from "@/domain/engine";
import type { BatchCondition } from "@/domain/types";

export const CONDITION_MODEL_NAME = "freshroute-condition-heuristic";
export const CONDITION_MODEL_VERSION = "0.1.0";

/** Degrees above optimal_temp_c treated as thermal stress, in addition to
 * anything below chilling_threshold_c. Documented engineering judgment
 * (same category as the D1 seed's commodity notes), not a literature
 * constant. */
const STRESS_BAND_ABOVE_OPTIMAL_C = 7;

export interface TelemetryReadingInput {
  recordedAt: Date;
  temperatureC: number | null;
}

export interface CommodityDecayParams {
  optimalTempC: number | null;
  chillingThresholdC: number | null;
  baseDecayPointsPerHour: number | null;
  /** Sourced respiration-rate Q10 (see scripts/db/seed.ts citation — Kader
   * (ed.), UC ANR 3311). Reused here as a quality-loss-rate coefficient,
   * not the physical quantity it was measured for — see computeQ10Weight's
   * doc comment. null (or a null optimalTempC, its reference point) leaves
   * every stress hour at its pre-Q10 flat weight of 1. */
  q10: number | null;
}

export interface ConditionAssessmentComputation {
  thermalExposureHours: number;
  qualityScore: number;
  decayPointsPerHour: number;
  remainingUsefulLifeHours: number;
  batchCondition: BatchCondition;
  modelName: string;
  modelVersion: string;
  inputSnapshot: {
    readingCount: number;
    stressBandAboveOptimalC: number;
    commodityParams: CommodityDecayParams;
    latestReading: { recordedAt: string; temperatureC: number | null } | null;
    /** Stored explicitly (not just derivable from qualityScore) because
     * qualityScore is clamped to [0,100] and loses information once a batch
     * is badly stressed — inverting the formula back out would silently go
     * wrong exactly when it matters most (a very degraded batch). */
    thermalExposureHours: number;
  };
}

function isStressReading(temperatureC: number | null, params: CommodityDecayParams): boolean {
  if (temperatureC === null) return false;
  if (params.chillingThresholdC !== null && temperatureC < params.chillingThresholdC) return true;
  if (params.optimalTempC !== null && temperatureC > params.optimalTempC + STRESS_BAND_ABOVE_OPTIMAL_C) return true;
  return false;
}

/**
 * How many "exposure hours" one real hour at this reading is worth.
 * Q10 (a respiration-RATE law) is applied ONLY above optimal_temp_c: heat
 * accelerating a climacteric fruit's respiration, and therefore its
 * quality loss, is exactly what Q10 describes. It is deliberately NOT
 * applied below chilling_threshold_c — chilling injury is tissue damage,
 * not slowed respiration, and it gets WORSE (not better) the colder or
 * longer a batch sits below that line. Feeding a sub-threshold reading
 * through q10^((T-Tref)/10) would produce a multiplier shrinking toward 0
 * as it gets colder — "colder is ever more protective, without bound" —
 * which is physically backwards once chilling injury has set in. So the
 * cold side keeps the original flat weight of 1 (same as before Q10 was
 * wired in); only the warm side is now temperature-magnitude-sensitive.
 */
function computeQ10Weight(temperatureC: number, params: CommodityDecayParams): number {
  if (params.q10 === null || params.optimalTempC === null) return 1; // no sourced q10/reference — unchanged flat weighting
  if (params.chillingThresholdC !== null && temperatureC < params.chillingThresholdC) return 1; // chilling injury, not a Q10 regime — see doc above
  return computeQ10RateMultiplier(temperatureC, { referenceTempC: params.optimalTempC, q10: params.q10 });
}

/**
 * Sums elapsed hours between consecutive readings where either endpoint was
 * a stress reading, weighting each interval by the average of its two
 * endpoints' Q10 rate multiplier (1.0 when q10/optimalTempC aren't sourced,
 * reproducing the pre-Q10 flat-hour behaviour exactly). A batch with zero
 * or one reading has zero measured exposure — we don't infer what happened
 * before measurement started.
 */
function computeThermalExposureHours(
  readings: TelemetryReadingInput[],
  params: CommodityDecayParams,
): number {
  if (readings.length < 2) return 0;
  const sorted = [...readings].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  let exposedHours = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const deltaHours = (curr.recordedAt.getTime() - prev.recordedAt.getTime()) / (1000 * 60 * 60);
    if (deltaHours <= 0) continue;
    if (isStressReading(prev.temperatureC, params) || isStressReading(curr.temperatureC, params)) {
      const prevWeight = prev.temperatureC !== null ? computeQ10Weight(prev.temperatureC, params) : 1;
      const currWeight = curr.temperatureC !== null ? computeQ10Weight(curr.temperatureC, params) : 1;
      exposedHours += deltaHours * ((prevWeight + currWeight) / 2);
    }
  }
  return exposedHours;
}

function bandCondition(qualityScore: number): BatchCondition {
  if (qualityScore >= 75) return "HEALTHY";
  if (qualityScore >= 40) return "MODERATE";
  return "DEGRADED";
}

export function computeConditionAssessment(
  readings: TelemetryReadingInput[],
  commodity: CommodityDecayParams,
): ConditionAssessmentComputation {
  const decayPointsPerHour = commodity.baseDecayPointsPerHour ?? 0.5; // engine's own demo default order of magnitude
  const thermalExposureHours = computeThermalExposureHours(readings, commodity);
  const qualityScore = Math.max(0, Math.min(100, 100 - thermalExposureHours * decayPointsPerHour));
  const batchCondition = bandCondition(qualityScore);
  const remainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(batchCondition, thermalExposureHours);

  const latest = readings.length > 0
    ? [...readings].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]
    : null;

  return {
    thermalExposureHours,
    qualityScore,
    decayPointsPerHour,
    remainingUsefulLifeHours,
    batchCondition,
    modelName: CONDITION_MODEL_NAME,
    modelVersion: CONDITION_MODEL_VERSION,
    inputSnapshot: {
      readingCount: readings.length,
      stressBandAboveOptimalC: STRESS_BAND_ABOVE_OPTIMAL_C,
      commodityParams: commodity,
      latestReading: latest ? { recordedAt: latest.recordedAt.toISOString(), temperatureC: latest.temperatureC } : null,
      thermalExposureHours,
    },
  };
}
