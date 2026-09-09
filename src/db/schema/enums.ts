/**
 * Postgres enum types for the FreshRoute schema (D1).
 *
 * These are DB-layer enums, independent of the TS literal unions in
 * src/domain/types/enums.ts. The decision engine stays framework-free and
 * must not import from here (schema-notes.md, "why the engine never imports
 * db code"). Values are kept textually aligned with the domain layer where
 * they describe the same concept (e.g. RecoveryAction / EvidenceTier) purely
 * for human readability — there is no code-level coupling.
 */
import { pgEnum } from "drizzle-orm/pg-core";

/** organization.type */
export const organizationTypeEnum = pgEnum("organization_type", [
  "FPO",
  "COLLECTION_CENTRE",
  "AGGREGATOR",
]);

/** batch.status — operational lifecycle state of a physical batch.
 * Distinct from recommendation.status (the decision lifecycle) and from the
 * domain layer's UI-facing BatchStatus (NORMAL/AT_RISK/...), which is a
 * display concern computed from live data, not a stored fact. */
export const batchStatusEnum = pgEnum("batch_status", [
  "ACTIVE",
  "IN_TRANSIT",
  "CLOSED",
  "DISCARDED",
]);

/** batch_telemetry.data_source — provenance of a single reading. */
export const telemetryDataSourceEnum = pgEnum("telemetry_data_source", [
  "OBSERVED",
  "SIMULATED",
  "USER_REPORTED",
]);

/** market.market_type — D0 finding: retail Uzhavar Sandhai and wholesale APMC
 * price levels are not comparable and must never be mixed in a spread
 * calculation. Stored, never derived from the name string at query time. */
export const marketTypeEnum = pgEnum("market_type", [
  "APMC",
  "UZHAVAR_SANDHAI",
  "OTHER",
]);

/** market_price.demand_source — D0 finding: the data.gov.in archive resource
 * has no arrivals column at all. ABSENT is the default and, in practice
 * today, the only value D2's loader will ever write (see schema-notes.md). */
export const demandSourceEnum = pgEnum("demand_source", [
  "ARRIVALS_OBSERVED",
  "ABSENT",
]);

/** action_type.evidence_tier — seeded per STAGE0: SELL/DISCOUNT/DIVERT are
 * VERIFIED; REROUTE/STORE/PROCESS are PLAUSIBLE_UNVERIFIED until field-validated. */
export const evidenceTierEnum = pgEnum("evidence_tier", [
  "VERIFIED",
  "PLAUSIBLE_UNVERIFIED",
]);

/** recommendation.status — the decision lifecycle (D4 writes the transitions
 * past ISSUED). */
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "ISSUED",
  "ACCEPTED",
  "REJECTED",
  "OVERRIDDEN",
  "EXPIRED",
]);

/** outcome_record.data_source — how the realized outcome was captured. */
export const outcomeDataSourceEnum = pgEnum("outcome_data_source", [
  "OPERATOR_REPORTED",
  "SYSTEM_INFERRED",
]);

/** ingestion_run.status */
export const ingestionRunStatusEnum = pgEnum("ingestion_run_status", [
  "RUNNING",
  "SUCCESS",
  "PARTIAL",
  "FAILED",
]);

/** lane.mode — transport mode. STAGE0 doesn't enumerate values; kept narrow
 * and extendable rather than free text so a typo can't silently create a
 * new "mode". */
export const laneModeEnum = pgEnum("lane_mode", ["ROAD", "RAIL", "MULTIMODAL"]);
