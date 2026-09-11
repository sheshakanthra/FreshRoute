/**
 * FreshRoute decision-engine backtest — DECAY-AWARE variant.
 *
 * Reuses, UNCHANGED: buildRealDecisionContext / deriveBaselineScenario
 * (src/domain-adapters), evaluateDecision (src/domain/engine),
 * computeConditionAssessment (src/server/assessment — the SAME function
 * production code uses to bridge real telemetry into the engine's
 * condition/thermalExposureHours inputs). No engine file is imported for
 * modification, none is touched.
 *
 * scripts/backtest/run.ts (the original, no-decay backtest) is NOT
 * overwritten or modified — its result is still a valid, useful artifact
 * (it isolates pure market/pricing decision-making). This script isolates
 * the opposite thing: what does the engine's OWN decay machinery actually
 * do once a batch is no longer replayed perfectly fresh every day.
 *
 * ============================================================================
 * WHAT "the engine's own decay function" TURNED OUT TO ACTUALLY BE — read
 * this before the assumptions below, because it drove every choice made
 * here:
 * ============================================================================
 *
 * The task that produced this script asked for decay driven by "the sourced
 * Q10/chilling parameters" (commodity.q10, .optimal_temp_c,
 * .chilling_threshold_c — see scripts/db/seed.ts's citation comment: USDA
 * Agricultural Handbook 66; Kader (ed.), Postharvest Technology of
 * Horticultural Crops, UC ANR Publication 3311). Reading src/domain/engine/
 * directly (rul.ts, constants.ts) rather than guessing shows this does NOT
 * exist as a continuous Q10-scaled decay curve anywhere in the codebase:
 *
 *   - grep for "q10" outside scripts/db/seed.ts and its schema column
 *     returns NOTHING. commodity.q10 = 2.50 is stored and cited, but no
 *     computation anywhere reads it. It is inert.
 *   - The engine's actual RUL model (rul.ts) takes exactly two inputs:
 *     `batch.condition` (a 3-state band, HEALTHY/MODERATE/DEGRADED, each a
 *     fixed multiplier on a flat 96h base shelf life) and
 *     `telemetry.thermalExposureHours` (a flat penalty of 8h of RUL burned
 *     per hour of recorded thermal stress). Neither is Q10-scaled or
 *     temperature-magnitude-scaled — chillingThresholdC/optimalTempC are
 *     used only as a binary stress/no-stress classifier, in
 *     src/server/assessment/computeConditionAssessment.ts (the one real,
 *     already-in-production bridge from telemetry to these two engine
 *     inputs — reused here unmodified, not reinvented).
 *   - That same file's own seed-script comment admits this:
 *     "The engine's actual decay model (D1 does not touch it) may scale
 *     this by Q10 and temperature deviation" — anticipated, never built.
 *
 * So "quality score declining per the engine's own decay function using the
 * sourced Q10/chilling parameters" was, AS FIRST WRITTEN, implemented here
 * as: feed the sourced chilling_threshold_c / optimal_temp_c /
 * base_decay_points_per_hour into computeConditionAssessment to get
 * thermalExposureHours and batchCondition; q10 itself was cited in
 * comments only, because no function in this codebase multiplied anything
 * by it. That paragraph is left in place, unedited, as the honest record
 * of what was true when this file was first run — see
 * docs/backtest/results-decay-aware.md for the full finding as reported
 * at the time.
 *
 * ----------------------------------------------------------------------
 * UPDATE (follow-up session): q10 is now wired in. computeQ10RateMultiplier
 * (src/domain/engine/rul.ts) implements the standard Q10 law
 * (rate(T) = rate(Tref) x Q10^((T-Tref)/10), Tref = the commodity's own
 * optimal_temp_c) as a pure, engine-layer function; computeConditionAssessment
 * (the one real caller, still the only place with per-reading temperatures)
 * now weights each stress hour it accumulates by this multiplier —
 * warm-side only, deliberately not on the chilling/cold side (chilling
 * injury is a threshold-damage mechanism, not a respiration-rate one; see
 * computeQ10Weight's doc comment in that file for why applying Q10 there
 * would be physically backwards). `q10ConsumedByAnyComputation` below now
 * reads `true`. See docs/backtest/results-decay-aware.md, "Q10 wired in"
 * section, for whether this moved the 6h/10h/10h45m/24h regime boundaries.
 * ----------------------------------------------------------------------
 *
 * ============================================================================
 * DOCUMENTED ASSUMPTIONS (judgment calls, not measurements):
 * ============================================================================
 *
 * 1. SAME market pair / window / variety / quantity / logistics / REROUTE
 *    execution-rights / demand-signal assumptions as the original backtest
 *    (scripts/backtest/run.ts) — reused verbatim for direct comparability,
 *    per the task's own instruction. See that file's header for #2-#6;
 *    not re-derived here.
 * 2. HARVEST-AGE, not a fresh-every-day batch. Multiple explicit scenarios
 *    are run (HARVEST_AGE_SCENARIOS below) rather than one arbitrary
 *    number, because a single probe run (see docs/backtest/results-
 *    decay-aware.md "breakeven analysis") showed the engine's own RUL
 *    arithmetic has a sharp, narrow cliff around 10-12 hours of continuous
 *    thermal stress — picking only one N either side of that cliff would
 *    hide exactly the behaviour worth reporting. The PRIMARY/headline
 *    scenario (id "h24", 24h) is the one used for the direct comparison
 *    against the original backtest's totals; the others are reported as
 *    sensitivity/breakeven context.
 * 3. AMBIENT TEMPERATURE DURING THAT HARVEST-AGE WINDOW = 28°C, constant,
 *    for every synthetic telemetry reading fed to computeConditionAssessment.
 *    This is a documented modelling placeholder, not a measured figure —
 *    but it is not an arbitrary one either: it represents an ordinary
 *    uncooled/non-reefer ambient temperature for Tamil Nadu (ordinary
 *    daytime and most nighttime temperatures in the state's tomato-growing
 *    districts exceed this most of the year), chosen specifically because
 *    it is ABOVE the commodity's own sourced stress threshold
 *    (optimal_temp_c 13°C + the 7°C stress band used by
 *    computeConditionAssessment = 20°C) — i.e. it models "no cold chain was
 *    used," which is the realistic default for smallholder Tamil Nadu
 *    tomato logistics, not a manufactured worst case. No source is cited
 *    for "28°C" itself (no met-station data was pulled for this session);
 *    it is flagged as a placeholder for exactly that reason.
 * 4. FACILITIES = [] for every REAL-DATA scenario run, even though
 *    storage_facility now holds 143 real, source-cited rows (from a prior
 *    facility-sourcing session) and processing_facility holds 4. This is a
 *    deliberate judgment call, not an oversight: every single one of those
 *    rows has cost_per_kg_per_day / gate_price_per_kg / etc. = NULL. The
 *    engine's own real-data mapper (src/server/context/
 *    buildRealBatchBaseline.ts, mapStorageFacility) coerces a NULL
 *    cost_per_kg_per_day to storageCostPerKgPerHour = 0 — i.e. FREE
 *    storage. Wiring the real rows into this backtest's economics would
 *    make STORE artificially win on invented-by-omission zero-cost
 *    storage, which is precisely the "manufacture a cleaner result" trap
 *    the task warned against. STORE and PROCESS are therefore left
 *    infeasible on every real-data day, for the same honest reason as the
 *    original backtest ("no facility is configured"), even though rows now
 *    exist in the table. A SEPARATE, clearly-labelled illustrative/
 *    synthetic run (below) shows what STORE's economics COULD look like
 *    using the two real, source-cited Thanjavur-district facilities
 *    (nearest real cold storage to the Kumbakonam planned market) with
 *    explicit placeholder tariffs — never blended into the headline number.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildRealDecisionContext,
  deriveBaselineScenario,
  type RealBatchBaseline,
  type RealMarketInfo,
} from "../../src/domain-adapters/buildRealDecisionContext";
import { evaluateDecision, ENGINE_VERSION } from "../../src/domain/engine";
import type { Facility, Scenario } from "../../src/domain/types";
import {
  computeConditionAssessment,
  type CommodityDecayParams,
} from "../../src/server/assessment/computeConditionAssessment";

const PROJ_ROOT = path.resolve(__dirname, "../..");
const OUT_CSV = path.join(PROJ_ROOT, "data", "backtest", "results-decay-aware.csv");
const OUT_SUMMARY = path.join(PROJ_ROOT, "data", "backtest", "summary-decay-aware.json");
const OUT_STORE_CSV = path.join(PROJ_ROOT, "data", "backtest", "results-decay-aware-store-illustrative.csv");
const ORIGINAL_SUMMARY = path.join(PROJ_ROOT, "data", "backtest", "summary.json");

function loadEnv() {
  const envPath = path.join(PROJ_ROOT, ".env");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

// ---- fixed, documented parameters shared with the original backtest ----
const VARIETY = "Deshi";
const QUANTITY_KG = 1000;
const INDICATIVE_LOGISTICS = { distanceKm: 150, etaHours: 6, transitCostPerKg: 1.1, handlingCostPerKg: 0.3 };
const PLANNED_MARKET_NAME = "Kumbakonam (Uzhavar Sandhai)";
const ALTERNATE_MARKET_NAME = "Krishnagiri (Uzhavar Sandhai)";

// ---- decay-aware-specific parameters (assumption #3) ----
const AMBIENT_TEMP_C = 28;

// ---- harvest-age scenarios (assumption #2) ----
interface HarvestAgeScenario {
  id: string;
  label: string;
  harvestAgeHours: number;
  primary?: boolean;
}
// ORIGINAL FOUR — kept at their original numeric values, UNCHANGED, so this
// run is a direct before/after comparison against the pre-Q10 report. Their
// labels describe where they sat relative to the pre-Q10 cliff (~10.5h);
// after wiring in Q10 (see rul.ts computeQ10RateMultiplier) the real cliff
// at this backtest's 28C ambient assumption compressed to ~2.7h (a fine
// sweep found SELL/REROUTE die between h=2.65 and h=2.70, DISCOUNT alone
// survives to about h=2.80) — so all four of these now sit deep past the
// new cliff. See docs/backtest/results-decay-aware.md, "Q10 wired in," for
// the full before/after comparison.
const HARVEST_AGE_SCENARIOS: HarvestAgeScenario[] = [
  { id: "h06", label: "6h since harvest — pre-Q10 label: same-day, well inside the feasibility margin", harvestAgeHours: 6 },
  { id: "h10", label: "10h since harvest — pre-Q10 label: just below the SELL/REROUTE infeasibility cliff", harvestAgeHours: 10 },
  {
    id: "h10_75",
    label: "10h45m since harvest — pre-Q10 label: the narrow band where only DISCOUNT survives",
    harvestAgeHours: 10.75,
  },
  {
    id: "h24",
    label: "24h (1 day) since harvest — PRIMARY: batch held overnight, uncooled, before today's decision",
    harvestAgeHours: 24,
    primary: true,
  },
  // RECALIBRATED — new checkpoints located against the post-Q10 cliff
  // (found via the fine sweep noted above), added so this run still shows
  // the magnitude-only / DISCOUNT-only / total-collapse regime structure
  // rather than all four legacy points landing on the same "everything's
  // infeasible" side of a cliff they were never calibrated against.
  { id: "h1_q10", label: "1h since harvest — RECALIBRATED: well inside the post-Q10 feasibility margin", harvestAgeHours: 1 },
  { id: "h2_5_q10", label: "2h30m since harvest — RECALIBRATED: just below the post-Q10 SELL/REROUTE cliff (~2.7h)", harvestAgeHours: 2.5 },
  { id: "h2_75_q10", label: "2h45m since harvest — RECALIBRATED: the narrow post-Q10 band where only DISCOUNT survives", harvestAgeHours: 2.75 },
];

// ---- illustrative/synthetic STORE placeholder tariffs (never blended into headline numbers) ----
const STORE_PLACEHOLDER_TARIFFS_PER_KG_PER_DAY = [0.1, 0.25, 0.5];

interface DayResult {
  date: string;
  scenarioId: string;
  chosenAction: string;
  engineValueInr: number;
  baselineValueInr: number;
  upliftInr: number;
  marginStatus: string;
  thermalExposureHours: number;
  qualityScore: number;
  batchCondition: string;
  plannedPriceDateUsed: string;
  plannedPriceStalenessDays: number;
  alternateAvailable: boolean;
}

async function main() {
  loadEnv();
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  try {
    const commodityRow = await sql<
      {
        id: string;
        name: string;
        optimal_temp_c: string | null;
        chilling_threshold_c: string | null;
        base_decay_points_per_hour: string | null;
        optimal_humidity_min: string | null;
        q10: string | null;
      }[]
    >`
      select id, name, optimal_temp_c, chilling_threshold_c, base_decay_points_per_hour, optimal_humidity_min, q10
      from commodity where code = 'TOMATO' limit 1
    `;
    if (!commodityRow[0]) throw new Error("TOMATO commodity not seeded");
    const commodity = commodityRow[0];
    console.log(
      `commodity decay params (sourced, see scripts/db/seed.ts citation): optimal_temp_c=${commodity.optimal_temp_c}, ` +
        `chilling_threshold_c=${commodity.chilling_threshold_c}, base_decay_points_per_hour=${commodity.base_decay_points_per_hour}, ` +
        `q10=${commodity.q10} (now consumed — warm-side Q10 rate scaling, see rul.ts computeQ10RateMultiplier / header UPDATE note)`,
    );

    const decayParams: CommodityDecayParams = {
      optimalTempC: commodity.optimal_temp_c !== null ? Number(commodity.optimal_temp_c) : null,
      chillingThresholdC: commodity.chilling_threshold_c !== null ? Number(commodity.chilling_threshold_c) : null,
      baseDecayPointsPerHour:
        commodity.base_decay_points_per_hour !== null ? Number(commodity.base_decay_points_per_hour) : null,
      q10: commodity.q10 !== null ? Number(commodity.q10) : null,
    };

    const planned = await sql<{ id: string; name: string }[]>`select id, name from market where name = ${PLANNED_MARKET_NAME} limit 1`;
    const alternate = await sql<{ id: string; name: string }[]>`select id, name from market where name = ${ALTERNATE_MARKET_NAME} limit 1`;
    if (!planned[0] || !alternate[0]) throw new Error("planned/alternate market not found by exact name");
    console.log(`planned market:   ${planned[0].name} (${planned[0].id})`);
    console.log(`alternate market: ${alternate[0].name} (${alternate[0].id})`);

    const [{ min_date, max_date }] = await sql<{ min_date: string; max_date: string }[]>`
      select min(price_date)::text as min_date, max(price_date)::text as max_date
      from market_price where market_id = ${planned[0].id} and commodity_id = ${commodity.id} and variety = ${VARIETY}
    `;
    console.log(`backtest window: ${min_date} to ${max_date} (same window as the original backtest)`);

    async function priceAsOf(marketId: string, asOfDate: string) {
      const rows = await sql<{ modal_price_inr_per_kg: string; price_date: string; fetched_at: Date }[]>`
        select modal_price_inr_per_kg, price_date::text, fetched_at
        from market_price
        where market_id = ${marketId} and commodity_id = ${commodity.id} and variety = ${VARIETY}
          and price_date <= ${asOfDate}
        order by price_date desc
        limit 1
      `;
      return rows[0] ?? null;
    }

    function toMarketInfo(id: string, name: string, price: { modal_price_inr_per_kg: string; price_date: string; fetched_at: Date } | null): RealMarketInfo {
      return {
        id,
        name,
        distanceKm: INDICATIVE_LOGISTICS.distanceKm,
        etaHours: INDICATIVE_LOGISTICS.etaHours,
        transitCostPerKg: INDICATIVE_LOGISTICS.transitCostPerKg,
        logisticsAreIndicative: true,
        latestPrice: price
          ? {
              modalPriceInrPerKg: Number(price.modal_price_inr_per_kg),
              priceDate: price.price_date,
              fetchedAt: price.fetched_at.toISOString(),
              demandSourceAbsent: true,
            }
          : null,
      };
    }

    // ---- pre-compute the (thermalExposureHours, batchCondition, qualityScore)
    // triple for each scenario ONCE — it is a function only of harvest age and
    // the fixed ambient-temperature assumption, not of the day being replayed
    // (the same "fixed every day" simplification the original backtest used
    // for condition=HEALTHY, now applied to a non-trivial harvest age). ----
    function computeDecayState(harvestAgeHours: number) {
      const readingCount = Math.max(2, Math.ceil(harvestAgeHours) + 1);
      const readings = Array.from({ length: readingCount }, (_, i) => {
        const t = Math.min(i, harvestAgeHours);
        return { recordedAt: new Date(t * 3600 * 1000), temperatureC: AMBIENT_TEMP_C };
      });
      return computeConditionAssessment(readings, decayParams);
    }

    const scenarioDecayState = new Map(HARVEST_AGE_SCENARIOS.map((s) => [s.id, computeDecayState(s.harvestAgeHours)]));

    console.log("\nper-scenario decay state (fixed across every day, see assumption #2):");
    for (const s of HARVEST_AGE_SCENARIOS) {
      const d = scenarioDecayState.get(s.id)!;
      console.log(
        `  ${s.id.padEnd(8)} thermalExposureHours=${d.thermalExposureHours.toFixed(1)} qualityScore=${d.qualityScore.toFixed(1)} condition=${d.batchCondition}${s.primary ? "  <- PRIMARY" : ""}`,
      );
    }

    // ---- day-by-day replay, all scenarios sharing the same fetched prices ----
    const start = new Date(min_date + "T00:00:00Z");
    const end = new Date(max_date + "T00:00:00Z");
    const results: DayResult[] = [];
    const storeIllustrativeResults: (DayResult & { tariffPerKgPerDay: number; facilityName: string })[] = [];
    const skippedDays: string[] = [];

    // Real, source-cited storage facilities nearest the planned market
    // (Kumbakonam), for the illustrative/synthetic STORE branch only —
    // see assumption #4. Queried live, not hardcoded.
    const storeCandidates = await sql<{ id: string; name: string; capacity_kg: string | null; district: string | null }[]>`
      select id, name, capacity_kg, district from storage_facility
      where district = 'Thanjavur'
      order by capacity_kg desc nulls last
    `;
    console.log(`\nillustrative STORE branch: ${storeCandidates.length} real Thanjavur-district facility row(s) found`);
    const illustrativeFacilityRow = storeCandidates[0]; // engine's own evaluateStore only ever looks at the first COLD_STORE match in context.facilities
    if (illustrativeFacilityRow) {
      console.log(`  using: ${illustrativeFacilityRow.name} (capacity ${illustrativeFacilityRow.capacity_kg} kg) — real name/location, SYNTHETIC placeholder cost`);
    }
    // Pre-cliff scenario only — see results-decay-aware.md for why running
    // the illustrative branch against an already-fully-infeasible harvest
    // age would be moot: nothing beats "nothing is feasible." Was h06
    // before Q10 was wired in; h06 is now itself past the compressed
    // (~2.7h) post-Q10 cliff, so this now points at the recalibrated
    // pre-cliff checkpoint instead.
    const storeScenario = HARVEST_AGE_SCENARIOS.find((s) => s.id === "h1_q10")!;
    const storeDecayState = scenarioDecayState.get(storeScenario.id)!;

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);

      const plannedPrice = await priceAsOf(planned[0].id, dateStr);
      if (!plannedPrice) {
        skippedDays.push(dateStr);
        continue;
      }
      const alternatePrice = await priceAsOf(alternate[0].id, dateStr);

      const markets: RealMarketInfo[] = [toMarketInfo(planned[0].id, planned[0].name, plannedPrice)];
      if (alternatePrice) markets.push(toMarketInfo(alternate[0].id, alternate[0].name, alternatePrice));

      const stalenessDays = Math.round((new Date(dateStr).getTime() - new Date(plannedPrice.price_date).getTime()) / 86400000);

      for (const hscenario of HARVEST_AGE_SCENARIOS) {
        const decayState = scenarioDecayState.get(hscenario.id)!;

        const baseline: RealBatchBaseline = {
          batchId: `backtest-decay-${hscenario.id}-${dateStr}`,
          commodityName: commodity.name,
          plannedMarketId: planned[0].id,
          currentLocationLabel: "Historical backtest — synthetic aged batch",
          quantityKg: QUANTITY_KG,
          batchCondition: decayState.batchCondition,
          qualityScore: decayState.qualityScore,
          thermalExposureHours: decayState.thermalExposureHours,
          capturedAtIso: `${dateStr}T00:00:00.000Z`,
          temperatureC: AMBIENT_TEMP_C,
          humidityPct: commodity.optimal_humidity_min !== null ? Number(commodity.optimal_humidity_min) : 80,
          markets,
          facilities: [], // assumption #4 — deliberately empty for the real-data run
          engineVersion: ENGINE_VERSION,
        };

        const scenario: Scenario = {
          ...deriveBaselineScenario(baseline),
          rerouteValidationAssumptionEnabled: true, // same as original backtest
        };

        const context = buildRealDecisionContext(baseline, scenario);
        const decision = evaluateDecision(context);
        const engineValue = decision.recommendedValue ?? decision.baselineValue;

        results.push({
          date: dateStr,
          scenarioId: hscenario.id,
          chosenAction: decision.recommendedAction ?? "",
          engineValueInr: Number(engineValue.toFixed(2)),
          baselineValueInr: Number(decision.baselineValue.toFixed(2)),
          upliftInr: Number((engineValue - decision.baselineValue).toFixed(2)),
          marginStatus: decision.marginStatus,
          thermalExposureHours: Number(decayState.thermalExposureHours.toFixed(2)),
          qualityScore: Number(decayState.qualityScore.toFixed(2)),
          batchCondition: decayState.batchCondition,
          plannedPriceDateUsed: plannedPrice.price_date,
          plannedPriceStalenessDays: stalenessDays,
          alternateAvailable: alternatePrice !== null,
        });
      }

      // ---- illustrative/synthetic STORE branch, pre-cliff scenario only ----
      if (illustrativeFacilityRow) {
        for (const tariff of STORE_PLACEHOLDER_TARIFFS_PER_KG_PER_DAY) {
          const storeFacility: Facility = {
            id: illustrativeFacilityRow.id,
            name: illustrativeFacilityRow.name,
            type: "COLD_STORE",
            capacityStatus:
              illustrativeFacilityRow.capacity_kg !== null && Number(illustrativeFacilityRow.capacity_kg) > 0
                ? "AVAILABLE"
                : "UNAVAILABLE",
            evidenceTier: "PLAUSIBLE_UNVERIFIED",
            distanceKm: INDICATIVE_LOGISTICS.distanceKm,
            etaHours: INDICATIVE_LOGISTICS.etaHours,
            transportCostPerKg: INDICATIVE_LOGISTICS.transitCostPerKg,
            handlingCostPerKg: INDICATIVE_LOGISTICS.handlingCostPerKg,
            storageCostPerKgPerHour: tariff / 24, // SYNTHETIC placeholder — see assumption #4 / results-decay-aware.md
            processingCostPerKg: 0,
            dataProvenance: "SYNTHETIC", // whole record: real name/location, but the cost driving the decision is fabricated
          };

          const baseline: RealBatchBaseline = {
            batchId: `backtest-store-illustrative-${tariff}-${dateStr}`,
            commodityName: commodity.name,
            plannedMarketId: planned[0].id,
            currentLocationLabel: "Historical backtest — synthetic aged batch (ILLUSTRATIVE STORE)",
            quantityKg: QUANTITY_KG,
            batchCondition: storeDecayState.batchCondition,
            qualityScore: storeDecayState.qualityScore,
            thermalExposureHours: storeDecayState.thermalExposureHours,
            capturedAtIso: `${dateStr}T00:00:00.000Z`,
            temperatureC: AMBIENT_TEMP_C,
            humidityPct: commodity.optimal_humidity_min !== null ? Number(commodity.optimal_humidity_min) : 80,
            markets,
            facilities: [storeFacility],
            engineVersion: ENGINE_VERSION,
          };
          const scenario: Scenario = { ...deriveBaselineScenario(baseline), rerouteValidationAssumptionEnabled: true };
          const context = buildRealDecisionContext(baseline, scenario);
          const decision = evaluateDecision(context);
          const engineValue = decision.recommendedValue ?? decision.baselineValue;

          storeIllustrativeResults.push({
            date: dateStr,
            scenarioId: `store-illustrative-${tariff}`,
            chosenAction: decision.recommendedAction ?? "",
            engineValueInr: Number(engineValue.toFixed(2)),
            baselineValueInr: Number(decision.baselineValue.toFixed(2)),
            upliftInr: Number((engineValue - decision.baselineValue).toFixed(2)),
            marginStatus: decision.marginStatus,
            thermalExposureHours: Number(storeDecayState.thermalExposureHours.toFixed(2)),
            qualityScore: Number(storeDecayState.qualityScore.toFixed(2)),
            batchCondition: storeDecayState.batchCondition,
            plannedPriceDateUsed: plannedPrice.price_date,
            plannedPriceStalenessDays: stalenessDays,
            alternateAvailable: alternatePrice !== null,
            tariffPerKgPerDay: tariff,
            facilityName: illustrativeFacilityRow.name,
          });
        }
      }
    }

    // ---- write real-data CSV ----
    const csvHeader = [
      "scenario_id", "date", "chosen_action", "engine_value_inr", "baseline_value_inr", "uplift_inr",
      "margin_status", "thermal_exposure_hours", "quality_score", "batch_condition",
      "planned_price_date_used", "planned_price_staleness_days", "alternate_available",
    ];
    const csvLines = [csvHeader.join(",")];
    for (const r of results) {
      csvLines.push(
        [
          r.scenarioId, r.date, r.chosenAction, r.engineValueInr, r.baselineValueInr, r.upliftInr,
          r.marginStatus, r.thermalExposureHours, r.qualityScore, r.batchCondition,
          r.plannedPriceDateUsed, r.plannedPriceStalenessDays, r.alternateAvailable,
        ].join(","),
      );
    }
    fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
    fs.writeFileSync(OUT_CSV, csvLines.join("\n"));
    console.log(`\nwrote ${results.length} rows (${HARVEST_AGE_SCENARIOS.length} scenarios x evaluated days) to ${OUT_CSV}`);

    // ---- write illustrative STORE CSV ----
    const storeCsvHeader = [...csvHeader, "tariff_per_kg_per_day", "facility_name"];
    const storeCsvLines = [storeCsvHeader.join(",")];
    for (const r of storeIllustrativeResults) {
      storeCsvLines.push(
        [
          r.scenarioId, r.date, r.chosenAction, r.engineValueInr, r.baselineValueInr, r.upliftInr,
          r.marginStatus, r.thermalExposureHours, r.qualityScore, r.batchCondition,
          r.plannedPriceDateUsed, r.plannedPriceStalenessDays, r.alternateAvailable,
          r.tariffPerKgPerDay, `"${r.facilityName}"`,
        ].join(","),
      );
    }
    fs.writeFileSync(OUT_STORE_CSV, storeCsvLines.join("\n"));
    console.log(`wrote ${storeIllustrativeResults.length} ILLUSTRATIVE/SYNTHETIC rows to ${OUT_STORE_CSV}`);

    // ---- per-scenario aggregation ----
    function aggregate(rows: DayResult[]) {
      const totalEngine = rows.reduce((s, r) => s + r.engineValueInr, 0);
      const totalBaseline = rows.reduce((s, r) => s + r.baselineValueInr, 0);
      const delta = totalEngine - totalBaseline;
      const deltaPct = totalBaseline !== 0 ? (delta / totalBaseline) * 100 : null;
      const actionMix: Record<string, number> = {};
      for (const r of rows) {
        const key = r.chosenAction || "NO_FEASIBLE_PATHWAY";
        actionMix[key] = (actionMix[key] ?? 0) + 1;
      }
      const daysWithUplift = rows.filter((r) => r.upliftInr > 0.01).length;
      return {
        evaluatedDays: rows.length,
        totals: {
          engineValueInr: Number(totalEngine.toFixed(2)),
          baselineValueInr: Number(totalBaseline.toFixed(2)),
          deltaInr: Number(delta.toFixed(2)),
          deltaPct: deltaPct !== null ? Number(deltaPct.toFixed(3)) : null,
        },
        actionMix,
        actionMixPct: Object.fromEntries(
          Object.entries(actionMix).map(([k, v]) => [k, Number(((v / rows.length) * 100).toFixed(1))]),
        ),
        daysWithPositiveUplift: daysWithUplift,
        daysWithoutUplift: rows.length - daysWithUplift,
      };
    }

    const perScenario: Record<string, unknown> = {};
    for (const s of HARVEST_AGE_SCENARIOS) {
      const rows = results.filter((r) => r.scenarioId === s.id);
      const decayState = scenarioDecayState.get(s.id)!;
      perScenario[s.id] = {
        label: s.label,
        harvestAgeHours: s.harvestAgeHours,
        primary: s.primary ?? false,
        decayState: {
          thermalExposureHours: Number(decayState.thermalExposureHours.toFixed(2)),
          qualityScore: Number(decayState.qualityScore.toFixed(2)),
          batchCondition: decayState.batchCondition,
        },
        ...aggregate(rows),
      };
    }

    const perTariff: Record<string, unknown> = {};
    for (const tariff of STORE_PLACEHOLDER_TARIFFS_PER_KG_PER_DAY) {
      const rows = storeIllustrativeResults.filter((r) => r.tariffPerKgPerDay === tariff);
      perTariff[`tariff_${tariff}`] = { tariffPerKgPerDay: tariff, ...aggregate(rows) };
    }

    let originalComparison: unknown = null;
    if (fs.existsSync(ORIGINAL_SUMMARY)) {
      const original = JSON.parse(fs.readFileSync(ORIGINAL_SUMMARY, "utf8"));
      const primary = perScenario[HARVEST_AGE_SCENARIOS.find((s) => s.primary)!.id] as { totals: { deltaInr: number; deltaPct: number | null }; actionMixPct: Record<string, number> };
      originalComparison = {
        note: "original = scripts/backtest/run.ts (fresh-every-day, HEALTHY/0h), read directly from data/backtest/summary.json, not retyped.",
        original: { deltaInr: original.totals.deltaInr, deltaPct: original.totals.deltaPct, actionMixPct: original.actionMixPct },
        decayAwarePrimary: { deltaInr: primary.totals.deltaInr, deltaPct: primary.totals.deltaPct, actionMixPct: primary.actionMixPct },
      };
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      window: { start: min_date, end: max_date, evaluatedDays: results.length / HARVEST_AGE_SCENARIOS.length, skippedDays: skippedDays.length },
      plannedMarket: planned[0].name,
      alternateMarket: alternate[0].name,
      variety: VARIETY,
      quantityKg: QUANTITY_KG,
      ambientTempCAssumption: AMBIENT_TEMP_C,
      commodityDecayParamsSourced: {
        optimalTempC: commodity.optimal_temp_c,
        chillingThresholdC: commodity.chilling_threshold_c,
        baseDecayPointsPerHour: commodity.base_decay_points_per_hour,
        q10: commodity.q10,
        q10ConsumedByAnyComputation: true,
        q10AppliedWarmSideOnly: "see src/domain/engine/rul.ts computeQ10RateMultiplier and computeConditionAssessment.ts computeQ10Weight",
      },
      primaryScenarioId: HARVEST_AGE_SCENARIOS.find((s) => s.primary)!.id,
      scenarios: perScenario,
      comparisonToOriginalNoDecayBacktest: originalComparison,
      illustrativeSyntheticStoreOnly: {
        warning: "NOT real economics. Real facility name/location/capacity (source-cited in storage_facility), placeholder cost only. Never blended into the headline scenarios above.",
        facilityUsed: illustrativeFacilityRow ? { name: illustrativeFacilityRow.name, district: illustrativeFacilityRow.district, capacityKg: illustrativeFacilityRow.capacity_kg } : null,
        harvestAgeScenarioUsed: storeScenario.id,
        byTariff: perTariff,
      },
    };

    fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
    console.log(`wrote summary to ${OUT_SUMMARY}`);
    console.log("\n=== SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("DECAY-AWARE BACKTEST FAILED:", e);
  process.exit(1);
});
