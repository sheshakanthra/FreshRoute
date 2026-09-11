import "server-only";
import { getBatch } from "../repositories/batches";
import { getCommodityByCode } from "../repositories/commodities";
import { getLatestConditionAssessment } from "../repositories/conditionAssessments";
import { listStorageFacilities, listProcessingFacilities } from "../repositories/facilities";
import { getLane } from "../repositories/lanes";
import { getMarket, listAlternateMarkets } from "../repositories/markets";
import { getLatestMarketPrice, getRecentMarketPriceTrend } from "../repositories/marketPrices";
import { listTelemetry } from "../repositories/telemetry";
import { computeConditionAssessment } from "../assessment/computeConditionAssessment";
import { ENGINE_VERSION } from "@/domain/engine";
import type { RealBatchBaseline, RealMarketInfo } from "@/domain-adapters/buildRealDecisionContext";
import type { Facility } from "@/domain/types";

/**
 * No routing/logistics data has ever been sourced for this project (D0 only
 * pulled market prices). These are the same order-of-magnitude figures the
 * demo data already used and disclosed as indicative — carried forward
 * rather than invented fresh, and explicitly flagged
 * (logisticsAreIndicative: true) on every market/facility that falls back
 * to them, so the UI can show it honestly rather than silently blending
 * real prices with fabricated-looking logistics.
 */
const INDICATIVE_LOGISTICS = { distanceKm: 150, etaHours: 6, transitCostPerKg: 1.1, handlingCostPerKg: 0.3 };

async function toRealMarketInfo(marketId: string, commodityId: string, originRef: string): Promise<RealMarketInfo | null> {
  const marketRow = await getMarket(marketId);
  if (!marketRow) return null;

  const lane = await getLane(originRef, marketId);
  const price = await getLatestMarketPrice(marketId, commodityId);
  const priceTrend = await getRecentMarketPriceTrend(marketId, commodityId, 30);

  return {
    id: marketRow.id,
    name: marketRow.name,
    distanceKm: lane ? Number(lane.distanceKm) : INDICATIVE_LOGISTICS.distanceKm,
    etaHours: lane ? Number(lane.typicalTransitHours) : INDICATIVE_LOGISTICS.etaHours,
    transitCostPerKg: INDICATIVE_LOGISTICS.transitCostPerKg, // no lane column carries a cost figure today
    logisticsAreIndicative: !lane,
    latestPrice: price
      ? {
          modalPriceInrPerKg: Number(price.modalPriceInrPerKg),
          priceDate: price.priceDate,
          fetchedAt: price.fetchedAt.toISOString(),
          demandSourceAbsent: price.demandSource === "ABSENT",
        }
      : null,
    priceTrend,
  };
}

type StorageFacilityRow = Awaited<ReturnType<typeof listStorageFacilities>>[number];

/**
 * A storage_facility row is only evaluable for STORE once every economics
 * column the sourcing report treats as "economics" is populated —
 * cost_per_kg_per_day, max_storage_days, storage_temp_c. Only the first is
 * consumed by mapStorageFacility today, but a row missing the other two is
 * exactly as unpriceable in spirit (147 real, source-cited rows have ALL
 * THREE null — no real tariff data has been sourced yet), and gating on
 * all three now means a future change that starts consuming
 * max_storage_days/storage_temp_c can't reintroduce this same defect by
 * quietly defaulting a field nobody thought to gate on.
 *
 * This is a type predicate, not just a runtime filter: TypeScript narrows
 * costPerKgPerDay to `string` (never `string | null`) inside
 * mapStorageFacility below, so the previous defect — `row.costPerKgPerDay
 * !== null ? Number(row.costPerKgPerDay) / 24 : 0` silently pricing a
 * missing tariff at zero/free — is no longer just avoided by convention,
 * it's impossible to write: there is no null case left to coerce.
 *
 * A facility filtered out here is NOT dropped silently — it's simply never
 * added to context.facilities, so evaluateStore's own existing, unmodified
 * "No cold-store facility is configured for this batch." infeasible
 * branch (src/domain/engine/evaluators.ts) is what a caller sees: the same
 * honest "no viable facility" treatment as a district with zero rows, per
 * this fix's requirement — fail safe, not fail cheap.
 */
function hasCompleteStorageEconomics(
  row: StorageFacilityRow,
): row is StorageFacilityRow & { costPerKgPerDay: string; maxStorageDays: number; storageTempC: string } {
  return row.costPerKgPerDay !== null && row.maxStorageDays !== null && row.storageTempC !== null;
}

function mapStorageFacility(
  row: StorageFacilityRow & { costPerKgPerDay: string; maxStorageDays: number; storageTempC: string },
): Facility {
  return {
    id: row.id,
    name: row.name,
    type: "COLD_STORE",
    capacityStatus: row.capacityKg !== null && Number(row.capacityKg) > 0 ? "AVAILABLE" : "UNAVAILABLE",
    // No real facility has ever been field-verified — PLAUSIBLE_UNVERIFIED
    // is the honest default for every DB-sourced facility today.
    evidenceTier: "PLAUSIBLE_UNVERIFIED",
    distanceKm: INDICATIVE_LOGISTICS.distanceKm,
    etaHours: INDICATIVE_LOGISTICS.etaHours,
    transportCostPerKg: INDICATIVE_LOGISTICS.transitCostPerKg,
    handlingCostPerKg: INDICATIVE_LOGISTICS.handlingCostPerKg,
    // Safe to divide directly now — hasCompleteStorageEconomics has
    // already excluded every row where this would have been null.
    storageCostPerKgPerHour: Number(row.costPerKgPerDay) / 24,
    processingCostPerKg: 0,
    dataProvenance: "SYNTHETIC", // distance/eta/cost fields specifically — see INDICATIVE_LOGISTICS
  };
}

type ProcessingFacilityRow = Awaited<ReturnType<typeof listProcessingFacilities>>[number];

/**
 * Mirrors hasCompleteStorageEconomics above, for processing_facility — same
 * defect class, same fix. gate_price_per_kg is the only one of these three
 * consumed today (as Facility.processingCostPerKg; evaluateProcess's price
 * side is the fixed PROCESS_OFFTAKE_PRICE_PER_KG constant, not read from
 * the facility at all). daily_capacity_kg is deliberately NOT gated here —
 * it already has its own existing capacityStatus branch below and in
 * evaluateProcess, the same separation storage keeps between capacity_kg
 * and its economics gate. product_form is descriptive, not economic, and
 * is excluded for the same reason.
 *
 * yield_ratio and min_quality_score aren't consumed by evaluateProcess
 * either (Facility carries no such fields) — gated anyway, same rationale
 * as storage's unused storage_temp_c/max_storage_days: a future change
 * that starts pricing off either one can't reintroduce this bug by
 * defaulting a field nobody thought to gate on.
 *
 * All 4 real processing_facility rows have every one of these five columns
 * NULL today (gate_price_per_kg, yield_ratio, min_quality_score,
 * daily_capacity_kg, product_form) — this filter excludes all 4, same as
 * capacityStatus already did on its own, for a different, coincidental
 * reason (see this file's PROCESS fix note).
 */
function hasCompleteProcessingEconomics(
  row: ProcessingFacilityRow,
): row is ProcessingFacilityRow & { gatePricePerKg: string; yieldRatio: string; minQualityScore: string } {
  return row.gatePricePerKg !== null && row.yieldRatio !== null && row.minQualityScore !== null;
}

function mapProcessingFacility(
  row: ProcessingFacilityRow & { gatePricePerKg: string; yieldRatio: string; minQualityScore: string },
): Facility {
  return {
    id: row.id,
    name: row.name,
    type: "PROCESSOR",
    capacityStatus: row.dailyCapacityKg !== null && Number(row.dailyCapacityKg) > 0 ? "AVAILABLE" : "UNAVAILABLE",
    evidenceTier: "PLAUSIBLE_UNVERIFIED",
    distanceKm: INDICATIVE_LOGISTICS.distanceKm,
    etaHours: INDICATIVE_LOGISTICS.etaHours,
    transportCostPerKg: INDICATIVE_LOGISTICS.transitCostPerKg,
    handlingCostPerKg: INDICATIVE_LOGISTICS.handlingCostPerKg,
    storageCostPerKgPerHour: 0,
    // Safe to convert directly now — hasCompleteProcessingEconomics has
    // already excluded every row where this would have been null.
    processingCostPerKg: Number(row.gatePricePerKg),
    dataProvenance: "SYNTHETIC",
  };
}

export async function buildRealBatchBaseline(batchId: string): Promise<RealBatchBaseline | null> {
  const batchRow = await getBatch(batchId);
  if (!batchRow || !batchRow.plannedMarketId) return null;

  const commodity = await getCommodityByCode("TOMATO"); // only commodity with real data today
  if (!commodity || batchRow.commodityId !== commodity.id) return null;

  const originRef = batchRow.currentLocation ?? batchRow.origin ?? "unknown-origin";

  // ---- condition (real telemetry -> the engine's existing categorical input) ----
  const latestAssessment = await getLatestConditionAssessment(batchId);
  let batchCondition: RealBatchBaseline["batchCondition"];
  let qualityScore: number;
  let thermalExposureHours: number;
  let capturedAtIso: string;
  let temperatureC: number;
  let humidityPct: number;

  if (latestAssessment) {
    const snapshot = latestAssessment.inputSnapshot as {
      latestReading?: { recordedAt: string; temperatureC: number | null };
      thermalExposureHours?: number;
    };
    qualityScore = Number(latestAssessment.qualityScore);
    batchCondition = bandFromQualityScore(qualityScore);
    thermalExposureHours = snapshot.thermalExposureHours ?? 0;
    capturedAtIso = snapshot.latestReading?.recordedAt ?? latestAssessment.computedAt.toISOString();
    temperatureC = snapshot.latestReading?.temperatureC ?? 20;
    humidityPct = 80; // not stored on condition_assessment; see note below
  } else {
    // Freshly created batch, no telemetry yet: compute the same way
    // appendTelemetry would, on zero readings — a healthy, unstressed default.
    const computation = computeConditionAssessment([], {
      optimalTempC: commodity.optimalTempC !== null ? Number(commodity.optimalTempC) : null,
      chillingThresholdC: commodity.chillingThresholdC !== null ? Number(commodity.chillingThresholdC) : null,
      baseDecayPointsPerHour: commodity.baseDecayPointsPerHour !== null ? Number(commodity.baseDecayPointsPerHour) : null,
      q10: commodity.q10 !== null ? Number(commodity.q10) : null,
    });
    batchCondition = computation.batchCondition;
    qualityScore = computation.qualityScore;
    thermalExposureHours = computation.thermalExposureHours;
    capturedAtIso = new Date().toISOString();
    temperatureC = commodity.optimalTempC !== null ? Number(commodity.optimalTempC) : 20;
    humidityPct = commodity.optimalHumidityMin !== null ? Number(commodity.optimalHumidityMin) : 80;
  }

  // Prefer the most recent raw telemetry reading's own temp/humidity for
  // display, when one exists — condition_assessment doesn't store humidity.
  const readings = await listTelemetry(batchId);
  if (readings.length > 0) {
    temperatureC = readings[0].temperatureC !== null ? Number(readings[0].temperatureC) : temperatureC;
    humidityPct = readings[0].humidityPct !== null ? Number(readings[0].humidityPct) : humidityPct;
  }

  // ---- markets: planned + a handful of real alternates for the same commodity ----
  const planned = await toRealMarketInfo(batchRow.plannedMarketId, commodity.id, originRef);
  if (!planned) return null;

  const alternates = await listAlternateMarkets(commodity.id, batchRow.plannedMarketId, 3);
  const alternateInfos = (
    await Promise.all(alternates.map((m) => toRealMarketInfo(m.id, commodity.id, originRef)))
  ).filter((m): m is RealMarketInfo => m !== null);

  const facilities: Facility[] = [
    ...(await listStorageFacilities()).filter(hasCompleteStorageEconomics).map(mapStorageFacility),
    ...(await listProcessingFacilities()).filter(hasCompleteProcessingEconomics).map(mapProcessingFacility),
  ];

  return {
    batchId: batchRow.id,
    commodityName: commodity.name,
    plannedMarketId: batchRow.plannedMarketId,
    currentLocationLabel: batchRow.currentLocation ?? batchRow.origin ?? "Unknown location",
    quantityKg: Number(batchRow.quantityKg),
    batchCondition,
    qualityScore,
    thermalExposureHours,
    capturedAtIso,
    temperatureC,
    humidityPct,
    markets: [planned, ...alternateInfos],
    facilities,
    engineVersion: ENGINE_VERSION,
  };
}

function bandFromQualityScore(qualityScore: number): RealBatchBaseline["batchCondition"] {
  if (qualityScore >= 75) return "HEALTHY";
  if (qualityScore >= 40) return "MODERATE";
  return "DEGRADED";
}
