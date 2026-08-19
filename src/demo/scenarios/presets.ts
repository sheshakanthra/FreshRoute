import type { Scenario } from "../../domain/types";

/** Section 20 / 25 — Scenario 01, the default initial state. Expected winner: SELL. */
export const SCENARIO_STABLE_SHIPMENT: Scenario = {
  id: "scenario-01-stable-shipment",
  name: "Stable shipment",
  description: "Baseline dispatch: no thermal stress or delay, planned market at normal strength.",
  thermalExposureHours: 0,
  transitDelayHours: 0,
  marketStrength: "MODERATE",
  batchCondition: "HEALTHY",
  rerouteValidationAssumptionEnabled: false,
};

/** Section 20 — Scenario 02. Expected winner: DIVERT. */
export const SCENARIO_THERMAL_EXPOSURE: Scenario = {
  id: "scenario-02-thermal-exposure",
  name: "Thermal exposure",
  description: "A reefer excursion mid-transit accelerates deterioration on the long-haul route.",
  thermalExposureHours: 4,
  transitDelayHours: 2,
  marketStrength: "MODERATE",
  batchCondition: "MODERATE",
  rerouteValidationAssumptionEnabled: false,
};

/** Section 20 — Scenario 03. Expected winner: REROUTE (validation assumption enabled). */
export const SCENARIO_MARKET_SHIFT: Scenario = {
  id: "scenario-03-market-shift",
  name: "Market shift",
  description: "Planned market demand has weakened while condition remains sound and reroute execution rights are confirmed.",
  thermalExposureHours: 1,
  transitDelayHours: 1,
  marketStrength: "WEAK",
  batchCondition: "HEALTHY",
  rerouteValidationAssumptionEnabled: true,
};

/** Section 15 / 50 — the extreme case used to verify the no-feasible-pathway safe state. */
export const SCENARIO_EXTREME_NO_FEASIBLE_PATHWAY: Scenario = {
  id: "scenario-extreme-no-feasible-pathway",
  name: "Extreme — no feasible pathway",
  description: "Maximum thermal exposure and transit delay on an already degraded batch.",
  thermalExposureHours: 6,
  transitDelayHours: 6,
  marketStrength: "WEAK",
  batchCondition: "DEGRADED",
  rerouteValidationAssumptionEnabled: false,
};

export const CURATED_SCENARIOS: Scenario[] = [
  SCENARIO_STABLE_SHIPMENT,
  SCENARIO_THERMAL_EXPOSURE,
  SCENARIO_MARKET_SHIFT,
];
