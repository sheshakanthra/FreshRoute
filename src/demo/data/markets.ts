import type { Market } from "../../domain/types";

/**
 * Section 12 / 28 — reachable markets. Two per commodity (a planned market
 * and one reachable alternate), covering every commodity in the demo batch
 * roster. buildDecisionContext filters this pool by the batch's own
 * commodity before handing it to the engine.
 */
export const markets: Market[] = [
  {
    id: "market-chennai-tomato-wholesale",
    name: "Chennai Wholesale Terminal",
    commodity: "Tomato",
    distanceKm: 320,
    etaHours: 9,
    transitCostPerKg: 1.1,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-bengaluru-tomato-wholesale",
    name: "Bengaluru Wholesale Terminal",
    commodity: "Tomato",
    distanceKm: 280,
    etaHours: 8,
    transitCostPerKg: 1.4,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-madurai-banana-wholesale",
    name: "Madurai Banana Wholesale",
    commodity: "Banana",
    distanceKm: 150,
    etaHours: 5,
    transitCostPerKg: 0.8,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-kochi-banana-wholesale",
    name: "Kochi Wholesale Terminal",
    commodity: "Banana",
    distanceKm: 230,
    etaHours: 7,
    transitCostPerKg: 1.0,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-krishnagiri-mango-mandi",
    name: "Krishnagiri Mango Mandi",
    commodity: "Mango",
    distanceKm: 120,
    etaHours: 4,
    transitCostPerKg: 0.9,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-chennai-mango-market",
    name: "Chennai Fruit Market",
    commodity: "Mango",
    distanceKm: 330,
    etaHours: 9,
    transitCostPerKg: 1.3,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-salem-onion-wholesale",
    name: "Salem Onion Wholesale",
    commodity: "Onion",
    distanceKm: 90,
    etaHours: 3,
    transitCostPerKg: 0.6,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-bengaluru-onion-yard",
    name: "Bengaluru Onion Yard",
    commodity: "Onion",
    distanceKm: 200,
    etaHours: 6,
    transitCostPerKg: 0.9,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-coimbatore-greens-market",
    name: "Coimbatore Green Market",
    commodity: "Leafy Greens",
    distanceKm: 60,
    etaHours: 2,
    transitCostPerKg: 0.5,
    dataProvenance: "SYNTHETIC",
  },
  {
    id: "market-chennai-greens-retail",
    name: "Chennai Retail Greens Hub",
    commodity: "Leafy Greens",
    distanceKm: 300,
    etaHours: 8,
    transitCostPerKg: 1.2,
    dataProvenance: "SYNTHETIC",
  },
];

/** Indicative base price per kg before scenario market-strength scaling is applied. */
export const MARKET_BASE_PRICE_PER_KG: Record<string, number> = {
  "market-chennai-tomato-wholesale": 17,
  "market-bengaluru-tomato-wholesale": 19.5,
  "market-madurai-banana-wholesale": 14,
  "market-kochi-banana-wholesale": 16.5,
  "market-krishnagiri-mango-mandi": 42,
  "market-chennai-mango-market": 47,
  "market-salem-onion-wholesale": 11,
  "market-bengaluru-onion-yard": 13.5,
  "market-coimbatore-greens-market": 9,
  "market-chennai-greens-retail": 11,
};
