/**
 * D3 — the real-data analog of src/demo/scenarios/buildContext.ts. Same job
 * (assemble the engine's existing DecisionContext), same pattern (scenario
 * overrides layered on a baseline), different source: a RealBatchBaseline
 * assembled server-side from Postgres (src/server/context), not the
 * hardcoded arrays in src/demo/data.
 *
 * Deliberately has NO drizzle/DB import — it only touches plain,
 * JSON-serializable data and the engine's own types/constants, so it is
 * safe to run in a client component (the scenario simulator recomputes it
 * on every slider change, exactly like the demo version always has).
 */
import {
  ALTERNATE_MARKET_FIRMNESS_MULTIPLIER,
  MARKET_STRENGTH_MULTIPLIER,
} from "@/domain/engine";
import type {
  Batch,
  DecisionContext,
  Facility,
  Market,
  MarketSnapshot,
  Scenario,
} from "@/domain/types";

export interface RealMarketInfo {
  id: string;
  name: string;
  distanceKm: number;
  etaHours: number;
  transitCostPerKg: number;
  /** true only for the fields above (distance/eta/transit cost) — see
   * src/server/context/buildRealBatchBaseline.ts for why these three are
   * still indicative rather than real (no routing data has ever been
   * sourced for this project). */
  logisticsAreIndicative: boolean;
  /** Real price, if one was found in market_price. Null means no price row
   * exists for this market+commodity at all. */
  latestPrice: {
    modalPriceInrPerKg: number;
    priceDate: string; // ISO date
    fetchedAt: string; // ISO datetime — staleness signal
    demandSourceAbsent: boolean;
  } | null;
  /** Recent real modal-price history (ascending by date, capped), from the
   * 115,538-row market_price table — for the market panel's trend
   * sparkline. Empty/absent when no price rows exist for this market+commodity,
   * or when the caller (e.g. backtest scripts) has no use for it. */
  priceTrend?: { priceDate: string; modalPriceInrPerKg: number }[];
}

export interface RealBatchBaseline {
  batchId: string;
  commodityName: string;
  plannedMarketId: string;
  currentLocationLabel: string;
  quantityKg: number;
  /** From the latest condition_assessment (or a fresh-batch default if none
   * exists yet — see src/server/context). */
  batchCondition: Batch["condition"];
  /** The continuous 0-100 score condition_assessment.quality_score actually
   * stores (100 for a fresh batch with no telemetry yet) — batchCondition
   * above is this same value banded into HEALTHY/MODERATE/DEGRADED for the
   * engine, which only ever takes the band, never the number. Carried here
   * so the UI can show both without the engine needing to know continuous
   * scores exist. This is the batch's own last-recorded figure, not
   * scenario-reactive — it doesn't move when a scenario override changes
   * batchCondition below (same as, e.g., a batch's currentPlanAction
   * staying fixed while the scenario slider explores a hypothetical). */
  qualityScore: number;
  thermalExposureHours: number;
  capturedAtIso: string;
  temperatureC: number;
  humidityPct: number;
  /** All real markets carrying price data for this commodity, planned
   * market included. */
  markets: RealMarketInfo[];
  facilities: Facility[];
  engineVersion: string;
}

/** Mirrors demo's deriveCurrentStateScenario: the batch's own real recorded
 * state, no override applied. */
export function deriveBaselineScenario(baseline: RealBatchBaseline): Scenario {
  return {
    id: `scenario-real-current-${baseline.batchId}`,
    name: "Current state",
    description: "The batch's own real telemetry-derived condition, with no scenario override applied.",
    thermalExposureHours: baseline.thermalExposureHours,
    transitDelayHours: 0, // no live transit-tracking source exists yet
    marketStrength: "MODERATE", // neutral multiplier (1.0) — shows the real reported price unscaled
    batchCondition: baseline.batchCondition,
    rerouteValidationAssumptionEnabled: false,
  };
}

export function buildRealDecisionContext(baseline: RealBatchBaseline, scenario: Scenario): DecisionContext {
  const batch: Batch = {
    id: baseline.batchId,
    commodity: baseline.commodityName,
    originFacilityId: "",
    plannedMarketId: baseline.plannedMarketId,
    currentLocationLabel: baseline.currentLocationLabel,
    quantityKg: baseline.quantityKg,
    saleableQuantityKg: baseline.quantityKg,
    condition: scenario.batchCondition,
    dispatchedAtIso: baseline.capturedAtIso,
    etaIso: baseline.capturedAtIso,
    transitDelayHours: scenario.transitDelayHours,
    currentPlanAction: "SELL", // no dedicated "operator plan" field/UI yet; SELL is the honest default for a batch nothing has overridden
    status: "NORMAL",
    telemetry: {
      batchId: baseline.batchId,
      capturedAtIso: baseline.capturedAtIso,
      temperatureC: baseline.temperatureC,
      humidityPct: baseline.humidityPct,
      thermalExposureHours: scenario.thermalExposureHours,
      dataProvenance: "REAL",
    },
    dataProvenance: "REAL",
  };

  const markets: Market[] = baseline.markets.map((m) => ({
    id: m.id,
    name: m.name,
    commodity: baseline.commodityName,
    distanceKm: m.distanceKm,
    etaHours: m.etaHours,
    transitCostPerKg: m.transitCostPerKg,
    dataProvenance: m.logisticsAreIndicative ? "SYNTHETIC" : "REAL",
  }));

  const marketSnapshots: MarketSnapshot[] = baseline.markets.map((m) => {
    const isPlanned = m.id === baseline.plannedMarketId;
    const strengthMultiplier = isPlanned
      ? MARKET_STRENGTH_MULTIPLIER[scenario.marketStrength]
      : ALTERNATE_MARKET_FIRMNESS_MULTIPLIER;
    const hasRealPrice = m.latestPrice !== null;
    const basePricePerKg = m.latestPrice?.modalPriceInrPerKg ?? 0;

    return {
      marketId: m.id,
      capturedAtIso: m.latestPrice?.fetchedAt ?? baseline.capturedAtIso,
      pricePerKg: Number((basePricePerKg * strengthMultiplier).toFixed(2)),
      // No real demand/arrivals signal exists anywhere (D0 finding) — MODERATE
      // is the neutral, non-biasing default, not an observed value.
      demandSignal: isPlanned ? scenario.marketStrength : "STRONG",
      expectedArrivalConditionNote: hasRealPrice
        ? `Real modal price for ${m.latestPrice!.priceDate} (fetched ${m.latestPrice!.fetchedAt}); no arrivals/demand data available for this market.`
        : "No price data available for this market — indicative figure.",
      dataProvenance: hasRealPrice ? "REAL" : "SYNTHETIC",
    };
  });

  return {
    batch,
    telemetry: batch.telemetry,
    markets,
    marketSnapshots,
    facilities: baseline.facilities,
    scenario,
    engineVersion: baseline.engineVersion,
  };
}
