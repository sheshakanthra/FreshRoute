import type { Market } from "../../domain/types";

/** Section 12 / 28 — the planned market and the one reachable alternate market. */
export const markets: Market[] = [
  {
    id: "market-planned-chennai-wholesale",
    name: "Chennai Wholesale Terminal",
    commodity: "Tomato",
    distanceKm: 320,
    etaHours: 9,
    transitCostPerKg: 1.1,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-alternate-bengaluru-wholesale",
    name: "Bengaluru Wholesale Terminal",
    commodity: "Tomato",
    distanceKm: 280,
    etaHours: 8,
    transitCostPerKg: 1.4,
    dataProvenance: "SYNTHETIC",
  },
];

/** Indicative base price per kg before scenario market-strength scaling is applied. */
export const MARKET_BASE_PRICE_PER_KG: Record<string, number> = {
  "market-planned-chennai-wholesale": 17,
  "market-alternate-bengaluru-wholesale": 19.5,
};
