/**
 * Core demo data model interfaces (Section 31).
 */

import type {
  BatchCondition,
  BatchStatus,
  CapacityStatus,
  DataProvenance,
  DemandSignal,
  EvidenceTier,
  FacilityType,
  FeasibilityStatus,
  RecoveryAction,
} from "./enums";

/** Section 11 — live condition readings behind a batch. */
export interface Telemetry {
  batchId: string;
  capturedAtIso: string;
  temperatureC: number;
  humidityPct: number;
  thermalExposureHours: number;
  dataProvenance: DataProvenance;
}

/** Section 9 / 10 — a perishable batch in transit or awaiting decision. */
export interface Batch {
  id: string;
  commodity: string;
  originFacilityId: string;
  /** The market the batch is currently planned to be sold at (Section 10 "Current plan: Sell to planned market"). */
  plannedMarketId: string;
  currentLocationLabel: string;
  quantityKg: number;
  saleableQuantityKg: number;
  condition: BatchCondition;
  dispatchedAtIso: string;
  etaIso: string;
  transitDelayHours: number;
  currentPlanAction: RecoveryAction;
  status: BatchStatus;
  telemetry: Telemetry;
  dataProvenance: DataProvenance;
}

/** Section 12 / 28 — a reachable market for a commodity. */
export interface Market {
  id: string;
  name: string;
  commodity: string;
  distanceKm: number;
  etaHours: number;
  transitCostPerKg: number;
  dataProvenance: DataProvenance;
}

/** Section 12 / 28 — a point-in-time price/demand read for a market. */
export interface MarketSnapshot {
  marketId: string;
  capturedAtIso: string;
  pricePerKg: number;
  demandSignal: DemandSignal;
  expectedArrivalConditionNote: string;
  dataProvenance: DataProvenance;
}

/** Section 29 — cold store / processor / secondary buyer. */
export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  capacityStatus: CapacityStatus;
  evidenceTier: EvidenceTier;
  distanceKm: number;
  etaHours: number;
  transportCostPerKg: number;
  handlingCostPerKg: number;
  storageCostPerKgPerHour: number;
  processingCostPerKg: number;
  dataProvenance: DataProvenance;
}

/** Section 34 — remaining useful life computed per candidate path, not one immutable batch value. */
export interface PathAwareRul {
  holdHours: number;
  transitHours: number;
  marketDwellHours: number;
  resultingUsefulLifeHours: number;
}

/** Section 13 / 22 — one evaluated recovery pathway before ranking. */
export interface CandidatePath {
  action: RecoveryAction;
  evidenceTier: EvidenceTier;
  feasibility: FeasibilityStatus;
  feasibilityReason?: string;
  pathAwareRul: PathAwareRul;
  targetMarketId?: string;
  targetFacilityId?: string;
  saleableKg: number;
  realizablePricePerKg: number;
  transportCost: number;
  handlingCost: number;
  storageCost: number;
  processingCost: number;
  riskAdjustment: number;
  expectedRecovery: number;
  assumptionFlags: string[];
}

/** Section 19 / 20 — the single state driving the scenario simulator and curated presets. */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  thermalExposureHours: number;
  transitDelayHours: number;
  marketStrength: DemandSignal;
  batchCondition: BatchCondition;
  rerouteValidationAssumptionEnabled: boolean;
}
