import type { BatchCondition, DataProvenance, DemandSignal, RecoveryAction, SourceType } from "../types/enums";

/** Section 0 / 36 — this build stage never connects live data. */
export const DEMO_MODE = true as const;

/** Section 36 — every demo dataset carries this provenance marker. */
export const DATA_PROVENANCE: DataProvenance = "SYNTHETIC";

/** Section 36 — accompanies dataProvenance on every demo dataset. */
export const SOURCE_TYPE: SourceType = "DEMO_SCENARIO";

/** Section 36 — explicit simulated-data flag alongside provenance. */
export const CONTAINS_SIMULATED_DATA = true as const;

/** Section 17 — engine version surfaced in the decision trace. */
export const ENGINE_VERSION = "freshroute-decision-engine@0.1.0-demo";

/** Section 23 — candidates within this relative gap of the winner trigger the narrow-margin state. */
export const NARROW_MARGIN_THRESHOLD_PCT = 5;

/** Section 21 — target relative advantage for curated-scenario winners over the runner-up. */
export const CURATED_SCENARIO_TARGET_MARGIN_PCT = 8;

// ---------------------------------------------------------------------------
// Section 34 — path-aware remaining useful life model.
// ---------------------------------------------------------------------------

/** Commodity-level shelf life at full health and zero thermal stress. */
export const BASE_SHELF_LIFE_HOURS = 96;

/** Section 19 — condition state consumes a share of shelf life before any path begins. */
export const CONDITION_RUL_MULTIPLIER: Record<BatchCondition, number> = {
  HEALTHY: 1.0,
  MODERATE: 0.65,
  DEGRADED: 0.25,
};

/** Each hour of recorded thermal exposure consumes this many hours of shelf life. */
export const THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR = 8;

/** Ambient/reefer transit consumes shelf life hour-for-hour. */
export const AMBIENT_DECAY_MULTIPLIER = 1.0;

/** Active cold storage slows deterioration relative to ambient transit. */
export const COLD_STORAGE_DECAY_MULTIPLIER = 0.2;

/** Fixed dwell time at a fresh-sale destination between arrival and transaction close. */
export const MARKET_DWELL_HOURS = 2;

/** A local diversion decision is made before most of the scenario's transit delay accrues. */
export const DIVERT_DELAY_EXPOSURE_FACTOR = 0.2;

/** Store/process diversions are also short local hops, similarly shielded from most transit delay. */
export const STORE_DELAY_EXPOSURE_FACTOR = 0.3;
export const PROCESS_DELAY_EXPOSURE_FACTOR = 0.3;

/** Section 14 — minimum resulting useful life (hours) for a pathway to remain feasible. */
export const FEASIBILITY_MIN_RUL_HOURS: Record<RecoveryAction, number> = {
  SELL: 4,
  DISCOUNT: 2,
  DIVERT: 1,
  REROUTE: 3,
  STORE: 0,
  PROCESS: -6,
};

// ---------------------------------------------------------------------------
// Section 33 — economic model.
// ---------------------------------------------------------------------------

/** Even a fully quality-degraded but still-feasible load retains this much price realization. */
export const QUALITY_PRICE_FLOOR_MULTIPLIER = 0.4;

/** Section 19 — destination market strength scales the planned market's realizable price. */
export const MARKET_STRENGTH_MULTIPLIER: Record<DemandSignal, number> = {
  WEAK: 0.78,
  MODERATE: 1.0,
  STRONG: 1.25,
};

/** The alternate/reroute market is a distinct demand pool, largely independent of the planned market's slider. */
export const ALTERNATE_MARKET_FIRMNESS_MULTIPLIER = 1.05;

export const SELL_HANDLING_COST_PER_KG = 0.25;
export const DISCOUNT_HANDLING_COST_PER_KG = 0.18;
export const REROUTE_HANDLING_COST_PER_KG = 0.35;

/** DISCOUNT intentionally undercuts market price to move inventory fast. */
export const DISCOUNT_PRICE_MULTIPLIER = 0.78;

/** A nearby secondary buyer pays less than the primary wholesale market. */
export const DIVERT_TARGET_PRICE_MULTIPLIER = 0.65;

/** STORE defers the sale to an uncertain future window, priced conservatively against today's snapshot. */
export const STORE_PRICE_DEFERRAL_MULTIPLIER = 0.95;
export const STORE_HOLD_HOURS = 24;

/** PROCESS sells into a stable off-take channel at a fixed price, independent of fresh-market swings. */
export const PROCESS_OFFTAKE_PRICE_PER_KG = 6.5;

/** Section 33 — risk adjustment rate applied to gross recovery, by evidence tier. */
export const VERIFIED_RISK_RATE = 0.02;
export const UNVERIFIED_RISK_RATE = 0.06;

/** Section 18 — machine-readable assumption text for plausible-unverified pathways. */
export const ASSUMPTION_FLAG_TEXT: Record<"REROUTE" | "STORE" | "PROCESS", string> = {
  REROUTE:
    "REROUTE assumes the operator can redirect the consignment mid-transit. Execution rights are not yet field-verified.",
  STORE:
    "STORE assumes the cold-store facility confirms capacity at booking. Facility availability is not yet field-verified.",
  PROCESS:
    "PROCESS assumes the processor accepts this batch at the modelled off-take price. Acceptance terms are not yet field-verified.",
};

/** Section 14 — the fixed reason REROUTE carries when the field-validation assumption has not been accepted. */
export const REROUTE_EXECUTION_RIGHTS_UNCONFIRMED_REASON =
  "Execution rights require field validation before this pathway can be treated as feasible.";
