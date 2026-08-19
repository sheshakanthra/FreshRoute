import { ALTERNATE_MARKET_FIRMNESS_MULTIPLIER, ENGINE_VERSION, MARKET_STRENGTH_MULTIPLIER } from "../../domain/engine";
import type { Batch, DecisionContext, MarketSnapshot, Scenario } from "../../domain/types";
import { facilities } from "../data/facilities";
import { markets, MARKET_BASE_PRICE_PER_KG } from "../data/markets";

/**
 * Section 19 — the single scenario state feeds every downstream figure. This
 * is the one place scenario dimensions are translated into a concrete
 * DecisionContext for the engine. Markets are filtered to the batch's own
 * commodity so REROUTE only ever considers a same-commodity alternate.
 */
export function buildDecisionContext(batch: Batch, scenario: Scenario): DecisionContext {
  const telemetry = {
    ...batch.telemetry,
    thermalExposureHours: scenario.thermalExposureHours,
  };

  const resolvedBatch: Batch = {
    ...batch,
    condition: scenario.batchCondition,
    transitDelayHours: scenario.transitDelayHours,
    telemetry,
  };

  const commodityMarkets = markets.filter((market) => market.commodity === batch.commodity);

  const marketSnapshots: MarketSnapshot[] = commodityMarkets.map((market) => {
    const isPlanned = market.id === resolvedBatch.plannedMarketId;
    const strengthMultiplier = isPlanned
      ? MARKET_STRENGTH_MULTIPLIER[scenario.marketStrength]
      : ALTERNATE_MARKET_FIRMNESS_MULTIPLIER;
    const basePricePerKg = MARKET_BASE_PRICE_PER_KG[market.id];

    return {
      marketId: market.id,
      capturedAtIso: telemetry.capturedAtIso,
      pricePerKg: Number((basePricePerKg * strengthMultiplier).toFixed(2)),
      demandSignal: isPlanned ? scenario.marketStrength : "STRONG",
      expectedArrivalConditionNote: "Indicative demo estimate from the synthetic transit model.",
      dataProvenance: "SYNTHETIC",
    };
  });

  return {
    batch: resolvedBatch,
    telemetry,
    markets: commodityMarkets,
    marketSnapshots,
    facilities,
    scenario,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * A scenario that mirrors a batch's own recorded condition and telemetry
 * exactly, with no override applied. Used for non-interactive contexts (the
 * dashboard and batch list) where every batch's own current state — not a
 * curated preset — should drive its recommendation.
 */
export function deriveCurrentStateScenario(batch: Batch): Scenario {
  return {
    id: `scenario-current-state-${batch.id}`,
    name: "Current state",
    description: "The batch's own recorded condition and telemetry, with no scenario override applied.",
    thermalExposureHours: batch.telemetry.thermalExposureHours,
    transitDelayHours: batch.transitDelayHours,
    marketStrength: "MODERATE",
    batchCondition: batch.condition,
    rerouteValidationAssumptionEnabled: false,
  };
}
