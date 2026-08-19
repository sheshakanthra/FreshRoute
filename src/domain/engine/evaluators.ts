/**
 * Section 32 / 34 — the six pathway evaluation functions.
 *
 * Every function reads condition, telemetry, markets, facilities and scenario
 * state off the same DecisionContext and computes its own path-aware RUL and
 * economics. None of them contain a static formula or a hard-coded winner —
 * REROUTE, STORE and PROCESS respond to exactly the same inputs as the
 * verified-core pathways.
 */

import type { DecisionContext } from "../types/decision";
import type { CandidatePath, Facility, Market, MarketSnapshot } from "../types/models";
import {
  ASSUMPTION_FLAG_TEXT,
  DISCOUNT_HANDLING_COST_PER_KG,
  DISCOUNT_PRICE_MULTIPLIER,
  DIVERT_DELAY_EXPOSURE_FACTOR,
  DIVERT_TARGET_PRICE_MULTIPLIER,
  MARKET_DWELL_HOURS,
  PROCESS_DELAY_EXPOSURE_FACTOR,
  PROCESS_OFFTAKE_PRICE_PER_KG,
  REROUTE_EXECUTION_RIGHTS_UNCONFIRMED_REASON,
  REROUTE_HANDLING_COST_PER_KG,
  SELL_HANDLING_COST_PER_KG,
  STORE_DELAY_EXPOSURE_FACTOR,
  STORE_HOLD_HOURS,
  STORE_PRICE_DEFERRAL_MULTIPLIER,
  AMBIENT_DECAY_MULTIPLIER,
  COLD_STORAGE_DECAY_MULTIPLIER,
} from "./constants";
import {
  computeExpectedRecovery,
  computeFreshSaleableFraction,
  computeProcessSaleableFraction,
  computeQualityFactor,
  computeQualityPriceMultiplier,
  computeRiskAdjustment,
} from "./economics";
import { checkRulFeasibility } from "./feasibility";
import { computeCurrentRemainingUsefulLifeHours, computePathAwareRul } from "./rul";

function findPlannedMarket(context: DecisionContext): { market: Market; snapshot: MarketSnapshot } {
  const market = context.markets.find((m) => m.id === context.batch.plannedMarketId);
  if (!market) {
    throw new Error(`Planned market ${context.batch.plannedMarketId} not found in decision context.`);
  }
  const snapshot = context.marketSnapshots.find((s) => s.marketId === market.id);
  if (!snapshot) {
    throw new Error(`No market snapshot for planned market ${market.id}.`);
  }
  return { market, snapshot };
}

function findAlternateMarket(context: DecisionContext): { market: Market; snapshot: MarketSnapshot } | undefined {
  const market = context.markets.find((m) => m.id !== context.batch.plannedMarketId);
  if (!market) return undefined;
  const snapshot = context.marketSnapshots.find((s) => s.marketId === market.id);
  if (!snapshot) return undefined;
  return { market, snapshot };
}

function findFacility(context: DecisionContext, type: Facility["type"]): Facility | undefined {
  return context.facilities.find((f) => f.type === type);
}

/** SELL — continue to the planned market at full realizable price. */
export function evaluateSell(context: DecisionContext): CandidatePath {
  const { batch, telemetry } = context;
  const { market, snapshot } = findPlannedMarket(context);

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);
  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: 0,
    holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    transitHours: market.etaHours + batch.transitDelayHours,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: MARKET_DWELL_HOURS,
  });

  const feasibility = checkRulFeasibility("SELL", pathAwareRul.resultingUsefulLifeHours);
  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);

  const saleableKg = batch.quantityKg * computeFreshSaleableFraction(qualityFactor);
  const realizablePricePerKg = snapshot.pricePerKg * computeQualityPriceMultiplier(qualityFactor);
  const transportCost = batch.quantityKg * market.transitCostPerKg;
  const handlingCost = batch.quantityKg * SELL_HANDLING_COST_PER_KG;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "VERIFIED" });

  return {
    action: "SELL",
    evidenceTier: "VERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetMarketId: market.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost: 0,
    processingCost: 0,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment,
    }),
    assumptionFlags: [],
  };
}

/** DISCOUNT — sell into the same planned market at a cut price for a faster, lower-dwell offload. */
export function evaluateDiscount(context: DecisionContext): CandidatePath {
  const { batch, telemetry } = context;
  const { market, snapshot } = findPlannedMarket(context);

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);
  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: 0,
    holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    transitHours: market.etaHours + batch.transitDelayHours,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: 0,
  });

  const feasibility = checkRulFeasibility("DISCOUNT", pathAwareRul.resultingUsefulLifeHours);
  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);

  const saleableKg = batch.quantityKg * computeFreshSaleableFraction(qualityFactor);
  const realizablePricePerKg =
    snapshot.pricePerKg * computeQualityPriceMultiplier(qualityFactor) * DISCOUNT_PRICE_MULTIPLIER;
  const transportCost = batch.quantityKg * market.transitCostPerKg;
  const handlingCost = batch.quantityKg * DISCOUNT_HANDLING_COST_PER_KG;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "VERIFIED" });

  return {
    action: "DISCOUNT",
    evidenceTier: "VERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetMarketId: market.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost: 0,
    processingCost: 0,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment,
    }),
    assumptionFlags: [],
  };
}

/** DIVERT — redirect now to the nearest verified secondary buyer to minimise further exposure. */
export function evaluateDivert(context: DecisionContext): CandidatePath {
  const { batch, telemetry } = context;
  const { snapshot: plannedSnapshot } = findPlannedMarket(context);
  const facility = findFacility(context, "SECONDARY_BUYER");

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);

  if (!facility) {
    const pathAwareRul = computePathAwareRul(currentRul, {
      holdHours: 0,
      holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      transitHours: 0,
      transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      marketDwellHours: 0,
    });
    return {
      action: "DIVERT",
      evidenceTier: "VERIFIED",
      feasibility: "INFEASIBLE",
      feasibilityReason: "No reachable secondary buyer is configured for this batch.",
      pathAwareRul,
      saleableKg: 0,
      realizablePricePerKg: 0,
      transportCost: 0,
      handlingCost: 0,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment: 0,
      expectedRecovery: 0,
      assumptionFlags: [],
    };
  }

  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: 0,
    holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    transitHours: facility.etaHours + batch.transitDelayHours * DIVERT_DELAY_EXPOSURE_FACTOR,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: 1,
  });

  const feasibility = checkRulFeasibility("DIVERT", pathAwareRul.resultingUsefulLifeHours);
  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);

  const saleableKg = batch.quantityKg * computeFreshSaleableFraction(qualityFactor);
  const realizablePricePerKg =
    plannedSnapshot.pricePerKg * DIVERT_TARGET_PRICE_MULTIPLIER * computeQualityPriceMultiplier(qualityFactor);
  const transportCost = batch.quantityKg * facility.transportCostPerKg;
  const handlingCost = batch.quantityKg * facility.handlingCostPerKg;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "VERIFIED" });

  return {
    action: "DIVERT",
    evidenceTier: "VERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetFacilityId: facility.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost: 0,
    processingCost: 0,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment,
    }),
    assumptionFlags: [],
  };
}

/** REROUTE — mid-transit redirect to a different market. Plausible-unverified: requires field-validated execution rights. */
export function evaluateReroute(context: DecisionContext): CandidatePath {
  const { batch, telemetry, scenario } = context;
  const alternate = findAlternateMarket(context);

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);

  if (!alternate) {
    const pathAwareRul = computePathAwareRul(currentRul, {
      holdHours: 0,
      holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      transitHours: 0,
      transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      marketDwellHours: 0,
    });
    return {
      action: "REROUTE",
      evidenceTier: "PLAUSIBLE_UNVERIFIED",
      feasibility: "INFEASIBLE",
      feasibilityReason: "No alternate market is configured for this batch.",
      pathAwareRul,
      saleableKg: 0,
      realizablePricePerKg: 0,
      transportCost: 0,
      handlingCost: 0,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment: 0,
      expectedRecovery: 0,
      assumptionFlags: [ASSUMPTION_FLAG_TEXT.REROUTE],
    };
  }

  const { market, snapshot } = alternate;
  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: 0,
    holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    transitHours: market.etaHours + batch.transitDelayHours,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: MARKET_DWELL_HOURS,
  });

  const rulFeasibility = checkRulFeasibility("REROUTE", pathAwareRul.resultingUsefulLifeHours);
  const feasibility = scenario.rerouteValidationAssumptionEnabled
    ? rulFeasibility
    : { feasible: false, reason: REROUTE_EXECUTION_RIGHTS_UNCONFIRMED_REASON };

  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);
  const saleableKg = batch.quantityKg * computeFreshSaleableFraction(qualityFactor);
  const realizablePricePerKg = snapshot.pricePerKg * computeQualityPriceMultiplier(qualityFactor);
  const transportCost = batch.quantityKg * market.transitCostPerKg;
  const handlingCost = batch.quantityKg * REROUTE_HANDLING_COST_PER_KG;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "PLAUSIBLE_UNVERIFIED" });

  return {
    action: "REROUTE",
    evidenceTier: "PLAUSIBLE_UNVERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetMarketId: market.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost: 0,
    processingCost: 0,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment,
    }),
    assumptionFlags: [ASSUMPTION_FLAG_TEXT.REROUTE],
  };
}

/** STORE — hold at a cold store to slow deterioration and defer the sale to a future window. Plausible-unverified. */
export function evaluateStore(context: DecisionContext): CandidatePath {
  const { batch, telemetry } = context;
  const { snapshot: plannedSnapshot } = findPlannedMarket(context);
  const facility = findFacility(context, "COLD_STORE");

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);

  if (!facility) {
    const pathAwareRul = computePathAwareRul(currentRul, {
      holdHours: 0,
      holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      transitHours: 0,
      transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      marketDwellHours: 0,
    });
    return {
      action: "STORE",
      evidenceTier: "PLAUSIBLE_UNVERIFIED",
      feasibility: "INFEASIBLE",
      feasibilityReason: "No cold-store facility is configured for this batch.",
      pathAwareRul,
      saleableKg: 0,
      realizablePricePerKg: 0,
      transportCost: 0,
      handlingCost: 0,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment: 0,
      expectedRecovery: 0,
      assumptionFlags: [ASSUMPTION_FLAG_TEXT.STORE],
    };
  }

  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: STORE_HOLD_HOURS,
    holdDecayMultiplier: COLD_STORAGE_DECAY_MULTIPLIER,
    transitHours: facility.etaHours + batch.transitDelayHours * STORE_DELAY_EXPOSURE_FACTOR,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: MARKET_DWELL_HOURS,
  });

  const rulFeasibility = checkRulFeasibility("STORE", pathAwareRul.resultingUsefulLifeHours);
  const feasibility =
    facility.capacityStatus === "AVAILABLE"
      ? rulFeasibility
      : { feasible: false, reason: `Storage capacity unavailable at ${facility.name}.` };

  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);
  const saleableKg = batch.quantityKg * computeFreshSaleableFraction(qualityFactor);
  const realizablePricePerKg =
    plannedSnapshot.pricePerKg * STORE_PRICE_DEFERRAL_MULTIPLIER * computeQualityPriceMultiplier(qualityFactor);
  const transportCost = batch.quantityKg * facility.transportCostPerKg;
  const handlingCost = batch.quantityKg * facility.handlingCostPerKg;
  const storageCost = batch.quantityKg * facility.storageCostPerKgPerHour * STORE_HOLD_HOURS;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost - storageCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "PLAUSIBLE_UNVERIFIED" });

  return {
    action: "STORE",
    evidenceTier: "PLAUSIBLE_UNVERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetFacilityId: facility.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost,
    processingCost: 0,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost,
      processingCost: 0,
      riskAdjustment,
    }),
    assumptionFlags: [ASSUMPTION_FLAG_TEXT.STORE],
  };
}

/** PROCESS — convert into a shelf-stable product at a fixed off-take price. Plausible-unverified. */
export function evaluateProcess(context: DecisionContext): CandidatePath {
  const { batch, telemetry } = context;
  const facility = findFacility(context, "PROCESSOR");

  const currentRul = computeCurrentRemainingUsefulLifeHours(batch.condition, telemetry.thermalExposureHours);

  if (!facility) {
    const pathAwareRul = computePathAwareRul(currentRul, {
      holdHours: 0,
      holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      transitHours: 0,
      transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
      marketDwellHours: 0,
    });
    return {
      action: "PROCESS",
      evidenceTier: "PLAUSIBLE_UNVERIFIED",
      feasibility: "INFEASIBLE",
      feasibilityReason: "No processing facility is configured for this batch.",
      pathAwareRul,
      saleableKg: 0,
      realizablePricePerKg: 0,
      transportCost: 0,
      handlingCost: 0,
      storageCost: 0,
      processingCost: 0,
      riskAdjustment: 0,
      expectedRecovery: 0,
      assumptionFlags: [ASSUMPTION_FLAG_TEXT.PROCESS],
    };
  }

  const pathAwareRul = computePathAwareRul(currentRul, {
    holdHours: 0,
    holdDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    transitHours: facility.etaHours + batch.transitDelayHours * PROCESS_DELAY_EXPOSURE_FACTOR,
    transitDecayMultiplier: AMBIENT_DECAY_MULTIPLIER,
    marketDwellHours: 1,
  });

  const rulFeasibility = checkRulFeasibility("PROCESS", pathAwareRul.resultingUsefulLifeHours);
  const feasibility =
    facility.capacityStatus === "AVAILABLE"
      ? rulFeasibility
      : { feasible: false, reason: `Processing capacity unavailable at ${facility.name}.` };

  const qualityFactor = computeQualityFactor(pathAwareRul.resultingUsefulLifeHours, currentRul);
  const saleableKg = batch.quantityKg * computeProcessSaleableFraction(qualityFactor);
  const realizablePricePerKg = PROCESS_OFFTAKE_PRICE_PER_KG;
  const transportCost = batch.quantityKg * facility.transportCostPerKg;
  const handlingCost = batch.quantityKg * facility.handlingCostPerKg;
  const processingCost = batch.quantityKg * facility.processingCostPerKg;
  const grossRecovery = saleableKg * realizablePricePerKg - transportCost - handlingCost - processingCost;
  const riskAdjustment = computeRiskAdjustment({ grossRecovery, evidenceTier: "PLAUSIBLE_UNVERIFIED" });

  return {
    action: "PROCESS",
    evidenceTier: "PLAUSIBLE_UNVERIFIED",
    feasibility: feasibility.feasible ? "FEASIBLE" : "INFEASIBLE",
    feasibilityReason: feasibility.reason,
    pathAwareRul,
    targetFacilityId: facility.id,
    saleableKg,
    realizablePricePerKg,
    transportCost,
    handlingCost,
    storageCost: 0,
    processingCost,
    riskAdjustment,
    expectedRecovery: computeExpectedRecovery({
      saleableKg,
      realizablePricePerKg,
      transportCost,
      handlingCost,
      storageCost: 0,
      processingCost,
      riskAdjustment,
    }),
    assumptionFlags: [ASSUMPTION_FLAG_TEXT.PROCESS],
  };
}
