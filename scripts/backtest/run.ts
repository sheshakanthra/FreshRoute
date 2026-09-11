/**
 * FreshRoute decision-engine backtest.
 *
 * Reuses, UNCHANGED: buildRealDecisionContext / deriveBaselineScenario
 * (src/domain-adapters), evaluateDecision (src/domain/engine). This script
 * only (a) constructs a RealBatchBaseline per historical day from real
 * market_price rows with a strict price_date <= asOfDate cutoff, and
 * (b) aggregates the engine's own DecisionResult output. No engine file is
 * imported for modification, none is touched.
 *
 * ============================================================================
 * DOCUMENTED ASSUMPTIONS (judgment calls, not measurements) — read before
 * trusting the headline number:
 * ============================================================================
 *
 * 1. SYNTHETIC BATCH, replayed fresh every day. This is NOT one batch decaying
 *    over 26 months — there is no real telemetry history to replay, so each
 *    day is evaluated as "if an idealized fresh batch existed today, what
 *    would the engine recommend using only prices known by today?" Batch
 *    condition = HEALTHY, thermal exposure = 0h, transit delay = 0h, fixed
 *    every day. This is the single biggest simplification in this backtest:
 *    it tests the engine's MARKET/PRICING decision-making in isolation, not
 *    its condition-decay modelling (which has no real data to test against
 *    yet — see D3/D4 sessions).
 * 2. QUANTITY: 1000 kg, fixed, arbitrary but constant across every day (cancels
 *    out of the %-delta headline; kept for absolute INR figures).
 * 3. REROUTE execution-rights assumption = TRUE for this backtest, unlike the
 *    live app's default (false). A backtest asks "was there economic value
 *    in rerouting," not "could ops actually execute it live today" — those
 *    are different questions, and conflating them would silently suppress
 *    REROUTE from ever appearing in the action mix. Stated explicitly because
 *    it's a real judgment call, not a neutral default.
 * 4. LOGISTICS (distanceKm/etaHours/transitCostPerKg) are the SAME indicative
 *    placeholder figures used in D3 (150km / 6h / ₹1.1 per kg) — no real
 *    routing data has ever been sourced for this project. Reused, not
 *    reinvented, and flagged the same way D3 flagged it.
 * 5. STORE/PROCESS/DIVERT are infeasible on every single day — 0 rows exist in
 *    storage_facility/processing_facility, ever, for the whole backtest
 *    window. This is a DATA gap (never sourced), not an engine or backtest
 *    finding. Reported as a stated limitation, not silently absorbed into
 *    "SELL/DISCOUNT/REROUTE win most of the time."
 * 6. demand_source is ABSENT on every market_price row (confirmed in D0) — the
 *    demand signal fed to the engine is the same neutral "MODERATE" default
 *    used everywhere else in this app, not a real observed signal.
 * 7. NO-LOOKAHEAD: for a given day D, only market_price rows with
 *    price_date <= D are visible (SQL-enforced, see priceAsOf() below) — the
 *    most recent such row is used (carry-forward), which can mean a "stale"
 *    price on days the market didn't report. This is honest replay, not a
 *    violation of the no-lookahead rule — it's what a real operator would
 *    have known on that day too. Staleness is measured and reported.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRealDecisionContext, deriveBaselineScenario, type RealBatchBaseline, type RealMarketInfo } from "../../src/domain-adapters/buildRealDecisionContext";
import { evaluateDecision, ENGINE_VERSION } from "../../src/domain/engine";
import type { Scenario } from "../../src/domain/types";

const PROJ_ROOT = path.resolve(__dirname, "../..");
const OUT_CSV = path.join(PROJ_ROOT, "data", "backtest", "results.csv");
const OUT_SUMMARY = path.join(PROJ_ROOT, "data", "backtest", "summary.json");

function loadEnv() {
  const envPath = path.join(PROJ_ROOT, ".env");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

// ---- fixed, documented parameters (see header) ----
const VARIETY = "Deshi";
const QUANTITY_KG = 1000;
const INDICATIVE_LOGISTICS = { distanceKm: 150, etaHours: 6, transitCostPerKg: 1.1 };
const PLANNED_MARKET_NAME = "Kumbakonam (Uzhavar Sandhai)";
const ALTERNATE_MARKET_NAME = "Krishnagiri (Uzhavar Sandhai)";

interface DayResult {
  date: string;
  chosenAction: string; // "" for NO_FEASIBLE_PATHWAY
  engineValueInr: number;
  baselineValueInr: number;
  upliftInr: number;
  marginStatus: string;
  plannedPriceDateUsed: string;
  plannedPriceStalenessDays: number;
  alternateAvailable: boolean;
  alternatePriceDateUsed: string;
}

async function main() {
  loadEnv();
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  try {
    const commodityRow = await sql<{ id: string; name: string; optimal_temp_c: string | null; optimal_humidity_min: string | null }[]>`
      select id, name, optimal_temp_c, optimal_humidity_min from commodity where code = 'TOMATO' limit 1
    `;
    if (!commodityRow[0]) throw new Error("TOMATO commodity not seeded");
    const commodity = commodityRow[0];

    const planned = await sql<{ id: string; name: string }[]>`select id, name from market where name = ${PLANNED_MARKET_NAME} limit 1`;
    const alternate = await sql<{ id: string; name: string }[]>`select id, name from market where name = ${ALTERNATE_MARKET_NAME} limit 1`;
    if (!planned[0] || !alternate[0]) throw new Error("planned/alternate market not found by exact name");
    console.log(`planned market:   ${planned[0].name} (${planned[0].id})`);
    console.log(`alternate market: ${alternate[0].name} (${alternate[0].id})`);

    const [{ min_date, max_date }] = await sql<{ min_date: string; max_date: string }[]>`
      select min(price_date)::text as min_date, max(price_date)::text as max_date
      from market_price where market_id = ${planned[0].id} and commodity_id = ${commodity.id} and variety = ${VARIETY}
    `;
    console.log(`backtest window: ${min_date} to ${max_date} (planned market's own measured span)`);

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
              demandSourceAbsent: true, // measured in D0: true on every row, unconditionally
            }
          : null,
      };
    }

    // ---- day-by-day replay ----
    const start = new Date(min_date + "T00:00:00Z");
    const end = new Date(max_date + "T00:00:00Z");
    const results: DayResult[] = [];
    const skippedDays: string[] = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);

      const plannedPrice = await priceAsOf(planned[0].id, dateStr);
      if (!plannedPrice) {
        skippedDays.push(dateStr); // no price yet known for the planned market as of this day
        continue;
      }
      const alternatePrice = await priceAsOf(alternate[0].id, dateStr);

      const markets: RealMarketInfo[] = [toMarketInfo(planned[0].id, planned[0].name, plannedPrice)];
      if (alternatePrice) markets.push(toMarketInfo(alternate[0].id, alternate[0].name, alternatePrice));

      const baseline: RealBatchBaseline = {
        batchId: `backtest-${dateStr}`,
        commodityName: commodity.name,
        plannedMarketId: planned[0].id,
        currentLocationLabel: "Historical backtest — synthetic batch",
        quantityKg: QUANTITY_KG,
        batchCondition: "HEALTHY", // assumption 1
        qualityScore: 100, // matches assumption 1's fresh, unstressed batch
        thermalExposureHours: 0, // assumption 1
        capturedAtIso: `${dateStr}T00:00:00.000Z`,
        temperatureC: commodity.optimal_temp_c !== null ? Number(commodity.optimal_temp_c) : 20,
        humidityPct: commodity.optimal_humidity_min !== null ? Number(commodity.optimal_humidity_min) : 80,
        markets,
        facilities: [], // assumption 5 — matches real DB state exactly (0 rows), not a stub
        engineVersion: ENGINE_VERSION,
      };

      const scenario: Scenario = {
        ...deriveBaselineScenario(baseline),
        rerouteValidationAssumptionEnabled: true, // assumption 3
      };

      const context = buildRealDecisionContext(baseline, scenario); // REUSED, unmodified
      const decision = evaluateDecision(context); // REUSED, unmodified engine

      const engineValue = decision.recommendedValue ?? decision.baselineValue; // NO_FEASIBLE_PATHWAY falls back to baseline (nothing better was found)
      const stalenessDays = Math.round(
        (new Date(dateStr).getTime() - new Date(plannedPrice.price_date).getTime()) / 86400000,
      );

      results.push({
        date: dateStr,
        chosenAction: decision.recommendedAction ?? "",
        engineValueInr: Number(engineValue.toFixed(2)),
        baselineValueInr: Number(decision.baselineValue.toFixed(2)),
        upliftInr: Number((engineValue - decision.baselineValue).toFixed(2)),
        marginStatus: decision.marginStatus,
        plannedPriceDateUsed: plannedPrice.price_date,
        plannedPriceStalenessDays: stalenessDays,
        alternateAvailable: alternatePrice !== null,
        alternatePriceDateUsed: alternatePrice?.price_date ?? "",
      });
    }

    // ---- write CSV ----
    const csvHeader = [
      "date", "chosen_action", "engine_value_inr", "baseline_value_inr", "uplift_inr",
      "margin_status", "planned_price_date_used", "planned_price_staleness_days",
      "alternate_available", "alternate_price_date_used",
    ];
    const csvLines = [csvHeader.join(",")];
    for (const r of results) {
      csvLines.push([
        r.date, r.chosenAction, r.engineValueInr, r.baselineValueInr, r.upliftInr,
        r.marginStatus, r.plannedPriceDateUsed, r.plannedPriceStalenessDays,
        r.alternateAvailable, r.alternatePriceDateUsed,
      ].join(","));
    }
    fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
    fs.writeFileSync(OUT_CSV, csvLines.join("\n"));
    console.log(`\nwrote ${results.length} rows to ${OUT_CSV}`);

    // ---- aggregate ----
    const totalEngine = results.reduce((s, r) => s + r.engineValueInr, 0);
    const totalBaseline = results.reduce((s, r) => s + r.baselineValueInr, 0);
    const delta = totalEngine - totalBaseline;
    const deltaPct = totalBaseline !== 0 ? (delta / totalBaseline) * 100 : null;

    const actionMix: Record<string, number> = {};
    for (const r of results) {
      const key = r.chosenAction || "NO_FEASIBLE_PATHWAY";
      actionMix[key] = (actionMix[key] ?? 0) + 1;
    }

    const sameDayCount = results.filter((r) => r.plannedPriceStalenessDays === 0).length;
    const staleCount = results.length - sameDayCount;
    const maxStaleness = Math.max(...results.map((r) => r.plannedPriceStalenessDays));
    const alternateAvailableCount = results.filter((r) => r.alternateAvailable).length;

    const daysWithUplift = results.filter((r) => r.upliftInr > 0.01).length;
    const daysWithoutUplift = results.length - daysWithUplift;

    const summary = {
      generatedAt: new Date().toISOString(),
      window: { start: min_date, end: max_date, totalDaysInSpan: results.length + skippedDays.length, evaluatedDays: results.length, skippedDays: skippedDays.length },
      plannedMarket: planned[0].name,
      alternateMarket: alternate[0].name,
      variety: VARIETY,
      quantityKg: QUANTITY_KG,
      totals: {
        engineValueInr: Number(totalEngine.toFixed(2)),
        baselineValueInr: Number(totalBaseline.toFixed(2)),
        deltaInr: Number(delta.toFixed(2)),
        deltaPct: deltaPct !== null ? Number(deltaPct.toFixed(3)) : null,
      },
      actionMix,
      actionMixPct: Object.fromEntries(
        Object.entries(actionMix).map(([k, v]) => [k, Number(((v / results.length) * 100).toFixed(1))]),
      ),
      priceStaleness: {
        sameDayPriceUsedDays: sameDayCount,
        staleDaysUsed: staleCount,
        maxStalenessDays: maxStaleness,
        alternateMarketAvailableDays: alternateAvailableCount,
        alternateMarketAvailablePct: Number(((alternateAvailableCount / results.length) * 100).toFixed(1)),
      },
      daysWithPositiveUplift: daysWithUplift,
      daysWithoutUplift: daysWithoutUplift,
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
  console.error("BACKTEST FAILED:", e);
  process.exit(1);
});
