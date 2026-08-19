/**
 * Enums / literal unions for the FreshRoute domain layer.
 * Section 31: use enums / literal unions instead of unrestricted strings.
 */

/** Section 1 / 31 — evidence status backing every candidate pathway. */
export type EvidenceTier = "VERIFIED" | "PLAUSIBLE_UNVERIFIED";

/** Section 14 — feasibility is a hard filter, not a score. */
export type FeasibilityStatus = "FEASIBLE" | "INFEASIBLE";

/** Section 1 — the six recovery pathways. */
export type RecoveryAction =
  | "SELL"
  | "DISCOUNT"
  | "DIVERT"
  | "REROUTE"
  | "STORE"
  | "PROCESS";

/** Section 19 — batch condition scale used by the scenario simulator. */
export type BatchCondition = "HEALTHY" | "MODERATE" | "DEGRADED";

/** Section 9 — dashboard/batch-card visual states. */
export type BatchStatus =
  | "NORMAL"
  | "AT_RISK"
  | "DECISION_REQUIRED"
  | "ASSUMPTION_FLAGGED";

/** Section 12 — destination market demand signal. */
export type DemandSignal = "WEAK" | "MODERATE" | "STRONG";

/** Section 13 — per-pathway risk level shown on the ranking list. */
export type RiskLevel = "LOW" | "MODERATE" | "HIGH";

/** Section 23 — narrow-margin policy outcome, plus the no-feasible-pathway safe state (Section 15). */
export type MarginStatus = "CLEAR" | "NARROW" | "NO_FEASIBLE_PATHWAY";

/** Section 35 — confidence is never a calibrated percentage. */
export type ConfidenceStatus = "SIMULATION-LIMITED";

/** Section 36 — every demo dataset carries this provenance marker. */
export type DataProvenance = "SYNTHETIC";

/** Section 36 — source type accompanying dataProvenance. */
export type SourceType = "DEMO_SCENARIO";

/** Section 29 — facility categories shown on /facilities. */
export type FacilityType = "COLD_STORE" | "PROCESSOR" | "SECONDARY_BUYER";

/** Section 29 — facility capacity state. */
export type CapacityStatus = "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
