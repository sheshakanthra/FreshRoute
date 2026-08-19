import { ALTERNATE_MARKET_FIRMNESS_MULTIPLIER, ENGINE_VERSION, MARKET_STRENGTH_MULTIPLIER } from "../../domain/engine";
import type { DecisionContext, MarketSnapshot, Scenario } from "../../domain/types";
import { referenceBatch, referenceTelemetry } from "../data/batch";
import { facilities } from "../data/facilities";
import { markets, MARKET_BASE_PRICE_PER_KG } from "../data/markets";

/**
 * Section 19 — the single scenario state feeds every downstream figure. This
 * is the one place scenario dimensions are translated into a concrete
 * DecisionContext for the engine.
 */
export function buildDecisionContext(scenario: Scenario): DecisionContext {
  const telemetry = {
    ...referenceTelemetry,
    thermalExposureHours: scenario.thermalExposureHours,
  };

  const batch = {
    ...referenceBatch,
    condition: scenario.batchCondition,
    transitDelayHours: scenario.transitDelayHours,
    telemetry,
  };

  const marketSnapshots: MarketSnapshot[] = markets.map((market) => {
    const isPlanned = market.id === batch.plannedMarketId;
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
    batch,
    telemetry,
    markets,
    marketSnapshots,
    facilities,
    scenario,
    engineVersion: ENGINE_VERSION,
  };
}
