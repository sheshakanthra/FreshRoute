export interface TemperatureTrendPoint {
  index: number;
  temperatureC: number;
}

/**
 * Section 11 — a short illustrative trend leading up to the current reading.
 * There is no per-minute telemetry history in this demo stage, so the last
 * five points are a fixed, deterministic offset pattern applied to today's
 * real reading (never randomised — determinism is a product requirement).
 * The final point is always exactly the current reading.
 */
const RELATIVE_OFFSET_PATTERN_C = [-0.6, 0.3, -0.4, 0.5, -0.2, 0];

export function buildTemperatureTrend(currentTemperatureC: number): TemperatureTrendPoint[] {
  return RELATIVE_OFFSET_PATTERN_C.map((offset, index) => ({
    index,
    temperatureC: Number((currentTemperatureC + offset).toFixed(1)),
  }));
}
