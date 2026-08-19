import type { DataProvenance, SourceType } from "../types/enums";

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
