# FreshRoute decision engine — backtest against real market data

Runner: `scripts/backtest/run.ts` (re-runnable — reads live `market_price`,
writes `data/backtest/results.csv` and `data/backtest/summary.json`).
Raw output from the run reported here is checked in at those two paths.

**The engine itself (`src/domain/engine/`) was not modified.** This script
only builds a `RealBatchBaseline` per historical day and calls the same
`buildRealDecisionContext` (from D3) and `evaluateDecision()` every other
part of the app calls.

## Headline result: a razor-thin, not-clearly-generalizable edge

| | |
|---|---|
| Window | 2024-07-16 → 2026-09-08 (785 days, 0 skipped) |
| Engine total value | ₹20,779,596.61 |
| Naive-baseline total value | ₹20,753,866.48 |
| **Delta** | **+₹25,730.13 (+0.124%)** |
| Days the engine's choice differed from baseline at all | **9 / 785 (1.1%)** |

**Read this plainly, not as a win.** The engine beat the naive baseline in
aggregate, but by 0.124% over more than two years, and every bit of that
delta came from exactly 9 days where REROUTE won — on the other 776 days
(98.9%) the engine's own answer *was* the baseline (it recommended SELL at
the same planned market the naive policy always uses, so the two are
identical by construction on those days, not just similar). This is not a
demonstrated, robust edge from the engine's pathway comparison — it's a
thin, occasional one, and the honest conclusion is **the engine did not
clearly beat the baseline in any way that would let you confidently predict
future outperformance from this alone.** With a real facility/processing
data source (see Limitations), the comparison could look very different —
this backtest cannot speak to that, only to the SELL/DISCOUNT/REROUTE
slice of the decision space that real data currently supports.

## Method

### 1. Markets chosen by measured continuity, not assumption

Queried `market_price` directly for reporting-day counts per (market,
variety), restricted to `market_type = UZHAVAR_SANDHAI` (D0/D1 rule: never
compare APMC against UZHAVAR_SANDHAI). Top result:

| Market | Variety | Reporting days | Span | Continuity | Max gap |
|---|---|---:|---|---:|---:|
| **Kumbakonam (Uzhavar Sandhai)** | Deshi | 766 | 2024-07-16 → 2026-09-08 | 97.6% | 2 days |

Used as the **planned market**. **Krishnagiri (Uzhavar Sandhai) / Deshi**
(765 days, essentially identical continuity) was used as the **REROUTE
alternate** — the 2nd-highest-continuity series in the same market_type and
variety, so the two sides of the comparison are apples-to-apples per D0's
rule.

### 2. Daily replay, strict no-lookahead

For every day D from 2024-07-16 to 2026-09-08:

1. **Price lookup**: `SELECT ... WHERE market_id = X AND price_date <= D ORDER BY price_date DESC LIMIT 1` for both markets. Never a price with `price_date > D` — enforced by the SQL predicate itself, not by application-level filtering after the fact.
2. Build a `RealBatchBaseline` for a synthetic batch "as of" that day (assumptions below), then call **`buildRealDecisionContext()`** and **`evaluateDecision()`** unchanged.
3. Record `decision.recommendedAction`, `decision.recommendedValue` (or `decision.baselineValue` on the rare `NO_FEASIBLE_PATHWAY` day — none occurred here), and `decision.baselineValue`.

**The baseline is not a separately-coded calculation** — it's `decision.baselineValue`, which `evaluateDecision()` already computes as "the candidate matching `batch.currentPlanAction`" (fixed to `SELL` at the planned market for every synthetic batch here). Reusing the engine's own number for both sides means both figures go through the exact same price/quantity/cost accounting — no separate, possibly-inconsistent baseline formula was written.

### 3. Documented assumptions (judgment calls — stated, not buried in code)

| # | Assumption | Why |
|---|---|---|
| 1 | **A fresh, idealized batch is replayed each day** (`condition = HEALTHY`, `thermal exposure = 0h`, `transit delay = 0h`, constant every day) — this is NOT one batch decaying over 26 months. | No real telemetry history exists to replay a real batch's condition day-by-day (D3/D4 only added telemetry capture going forward). This backtest tests the engine's **market/pricing** decision-making in isolation, not its condition-decay modelling. |
| 2 | Quantity fixed at **1,000 kg** every day. | Arbitrary but constant — cancels out of the %-delta headline, kept only for absolute ₹ figures. |
| 3 | **REROUTE execution-rights assumption = `true`** for this backtest (the live app defaults it to `false`). | A backtest asks "was there economic value in rerouting," not "could ops execute it live today" — different questions. With the live default (`false`), REROUTE would never appear at all, and the 9-day result above would not exist to report. |
| 4 | Logistics (distance/ETA/transit cost) reuse the **same indicative placeholders from D3** (150 km / 6h / ₹1.1 per kg) — not reinvented. | No real routing data has ever been sourced for this project. |
| 5 | Demand signal fixed to the neutral `MODERATE` default. | `demand_source` is `ABSENT` on every real row (D0 finding) — there is no real signal to feed in. |

### 4. Action-mix breakdown

| Action | Days | % |
|---|---:|---:|
| SELL | 776 | 98.9% |
| REROUTE | 9 | 1.1% |
| DISCOUNT | 0 | 0.0% |
| DIVERT | 0 | 0.0% |
| STORE | 0 | 0.0% |
| PROCESS | 0 | 0.0% |
| NO_FEASIBLE_PATHWAY | 0 | 0.0% |

**STORE, PROCESS, and DIVERT never won a single day out of 785 — because
they were structurally infeasible on every single day.** `storage_facility`
and `processing_facility` have zero rows (no facility data has ever been
sourced), and no secondary-buyer data source exists either. This is a
**data gap, stated as a limitation of this backtest, not a finding that
those pathways don't work** — the engine never got to evaluate a real
instance of either.

**DISCOUNT never won either**, for a structural reason worth naming: DISCOUNT
trades a lower price for less market dwell time, which only pays off when
remaining shelf life is under real pressure. Because assumption #1 replays
an idealized, always-fresh batch with a huge RUL margin every day, there was
never a day where that trade was worth making. This is an artifact of the
backtest's batch-freshness assumption, not evidence DISCOUNT is a weak
pathway in general — a backtest that could replay real per-batch decay would
very plausibly show DISCOUNT winning some days.

The 9 REROUTE days, individually:

| Date | Engine value | Baseline value | Uplift | Margin |
|---|---:|---:|---:|---|
| 2024-09-05 | ₹24,422.37 | ₹22,572.67 | ₹1,849.70 | CLEAR |
| 2024-09-06 | ₹24,422.37 | ₹22,572.67 | ₹1,849.70 | CLEAR |
| 2024-11-19 | ₹29,579.45 | ₹27,693.17 | ₹1,886.28 | CLEAR |
| 2024-12-03 | ₹50,207.75 | ₹44,761.50 | ₹5,446.25 | CLEAR |
| 2024-12-04 | ₹53,645.80 | ₹46,468.33 | ₹7,177.47 | CLEAR |
| 2025-02-02 | ₹20,984.32 | ₹19,159.00 | ₹1,825.32 | CLEAR |
| 2025-06-23 | ₹20,984.32 | ₹20,012.42 | ₹971.90 | NARROW |
| 2025-09-06 | ₹24,422.37 | ₹24,279.50 | ₹142.87 | NARROW |
| 2025-11-22 | ₹48,488.72 | ₹43,908.08 | ₹4,580.64 | CLEAR |

Two of the nine (2025-06-23, 2025-09-06) are flagged `NARROW` margin by the
engine's own policy — meaning even the engine considers those two calls
economically close, not clean wins. The real, unambiguous uplift is
concentrated in 5–6 days out of 785.

### 5. No-lookahead and staleness, measured

| | |
|---|---|
| Days with a same-day price for the planned market | 766 / 785 (97.6%) |
| Days where the most-recent-known price was stale (carried forward) | 19 / 785 (2.4%) |
| Maximum staleness | 2 days |
| Days the alternate market had any price at all (i.e., REROUTE was even evaluable) | 785 / 785 (100%) |

No lookahead occurred — every price used had `price_date <= D` by
construction (SQL predicate, not a post-hoc filter). The 19 stale days are
expected carry-forward on the market's own occasional non-reporting days,
consistent with the ~2.4% gap rate already measured in D0.

## Limitations (stated explicitly, not buried)

1. **STORE and PROCESS were never evaluable** — `storage_facility` and
   `processing_facility` are empty tables. This backtest says nothing about
   whether those pathways would help; it only says the engine correctly
   marked them infeasible every time, which is the honest behavior given no
   facility data exists.
2. **DIVERT was never evaluable** for the same reason — no secondary-buyer
   data source has ever been sourced.
3. **`demand_source` is `ABSENT`** on every real price row — the engine's
   demand signal is a fixed neutral default throughout, not a real arrivals
   observation. Confidence, had it been computed here (it isn't — this
   script doesn't touch `recommendation`/`confidence`, which is a D3/D4
   persistence concept, not an engine output), would reflect that same
   absence on every simulated day, same as the live app.
4. **No real batch condition/decay history was replayed** — see assumption
   #1. This is the largest simplification: a backtest that could incorporate
   real telemetry-driven decay per batch would test a materially different
   (and more complete) slice of the engine's logic.
5. **Logistics figures are indicative, not real**, for both markets, every
   day — no routing data source exists.
6. **Single market pair.** Only one planned/alternate pair was tested (the
   two highest-continuity real series). A backtest across many market pairs
   might show a different, possibly stronger or weaker, aggregate pattern —
   this result should not be read as "the engine beats baseline by 0.124%
   everywhere," only "on this one real, well-covered market pair, over this
   real window, under these stated assumptions."

## Files

```
scripts/backtest/run.ts              # the runner (re-runnable)
scripts/backtest/measure-continuity.ts  # the market-selection measurement
data/backtest/results.csv            # 785 rows, one per day
data/backtest/summary.json           # the aggregate numbers quoted above
docs/backtest/results.md             # this file
```
