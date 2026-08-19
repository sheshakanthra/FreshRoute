import type { Batch, Telemetry } from "../../domain/types";

/** Section 10 — the reference batch used throughout the demo: FR-2048, Tomato, 2,000 kg. */
export const referenceTelemetry: Telemetry = {
  batchId: "FR-2048",
  capturedAtIso: "2026-01-15T10:18:00+05:30",
  temperatureC: 6,
  humidityPct: 88,
  thermalExposureHours: 0,
  dataProvenance: "SYNTHETIC",
};

export const referenceBatch: Batch = {
  id: "FR-2048",
  commodity: "Tomato",
  originFacilityId: "origin-tamil-nadu-hub",
  plannedMarketId: "market-chennai-tomato-wholesale",
  currentLocationLabel: "Tamil Nadu hub",
  quantityKg: 2000,
  saleableQuantityKg: 2000,
  condition: "HEALTHY",
  dispatchedAtIso: "2026-01-15T06:00:00+05:30",
  etaIso: "2026-01-15T19:00:00+05:30",
  transitDelayHours: 0,
  currentPlanAction: "SELL",
  status: "NORMAL",
  telemetry: referenceTelemetry,
  dataProvenance: "SYNTHETIC",
};
