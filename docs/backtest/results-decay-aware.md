# FreshRoute decision engine — decay-aware backtest

Runner: `scripts/backtest/run-decay-aware.ts` (re-runnable — reads live
`market_price`/`commodity`/`storage_facility`, writes
`data/backtest/results-decay-aware.csv`,
`data/backtest/results-decay-aware-store-illustrative.csv`, and
`data/backtest/summary-decay-aware.json`). Raw output is checked in at
those three paths. `scripts/backtest/run.ts`, the original no-decay
backtest, is **untouched** — its result (`docs/backtest/results.md`) is
still a valid artifact testing a different slice of the engine.

**As originally written, the engine (`src/domain/engine/`) was not
modified.** A follow-up session (see "Q10 wired in" below) added one new
pure function to `rul.ts` — `computeQ10RateMultiplier` — which is the one
change to `domain/engine/` this project has made since D1. Everything else
in this paragraph is still accurate: this script builds a
`RealBatchBaseline` per historical day exactly like the original, and
reuses `buildRealDecisionContext`, `evaluateDecision`, and
`computeConditionAssessment` (`src/server/assessment/`, the same real,
already-in-production function that bridges telemetry into the engine's
inputs for a live batch), all unmodified.

## Q10 wired in (follow-up session) — read this before the rest of the report

The section immediately below ("Read this first") is left exactly as first
written: an accurate record of what was true when this backtest was first
run — `commodity.q10` sourced and cited, but consumed by nothing. A
follow-up session changed that. This section is the update; everything
after it is the **original, now partially superseded** report, kept intact
for the historical before/after comparison rather than silently rewritten.

### What changed in the RUL calculation

One new pure function, `computeQ10RateMultiplier`, was added to
`src/domain/engine/rul.ts` — the only change made to `domain/engine/` since
D1:

```ts
rate(T) = rate(Tref) x Q10 ^ ((T - Tref) / 10)
```

`rul.ts` itself still only ever sees `condition` and `thermalExposureHours`
— its formula (`BASE_SHELF_LIFE_HOURS x CONDITION_RUL_MULTIPLIER[condition]
- thermalExposureHours x THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR`) is
**untouched**, because it never had access to raw temperature in the first
place; only `computeConditionAssessment` (which processes a list of
timestamped, per-reading temperatures) does. So the wiring happens one
layer up, in the one real function that already bridges telemetry into
`thermalExposureHours`: each stress-hour it accumulates is now weighted by
`computeQ10RateMultiplier(reading_temp, { referenceTempC: optimal_temp_c,
q10 })` instead of counting flat at 1.0. `thermalExposureHours` itself is
therefore no longer a literal wall-clock hour count — it's a **Q10-weighted
effective exposure** — but its name, its DB column
(`batch_telemetry.thermal_exposure_hours`), and every downstream consumer
(`rul.ts`'s flat 8h-per-hour penalty, the UI's hour labels) are unchanged,
because the quantity is still denominated in "hours" by construction.

**Is this an addition or a replacement?** An addition, and the two
mechanisms are not redundant, because they were never doing the same job:
`CONDITION_RUL_MULTIPLIER` (HEALTHY/MODERATE/DEGRADED) is a coarse,
persistent band — how bad is this batch's *overall* state; Q10 now makes
the *rate at which new exposure accrues* temperature-sensitive, which is a
different question (how fast is today's environment burning shelf life).
Nothing about the condition-band multiplier changed.

**Q10 is applied on the warm side only — never on the chilling/cold side.**
This is the one deliberate asymmetry in the design, and it's a physical-
correctness call, not an oversight: Q10 is a **respiration-rate law**,
valid in the normal physiological range. Chilling injury (temperatures
below `chilling_threshold_c`) is tissue damage — a threshold/damage
mechanism that gets *worse*, not better, the colder or longer a batch sits
below that line. Feeding a sub-threshold reading through
`q10^((T-Tref)/10)` would produce a multiplier shrinking toward 0 as it
gets colder — "colder is ever more protective, without bound" — which is
backwards once chilling injury has set in. So `computeQ10Weight` (the new
helper in `computeConditionAssessment.ts`) returns a flat weight of 1
(unchanged, pre-Q10 behaviour) for any reading below the chilling
threshold, and only applies the exponential curve above the stress band.
Verified directly: a synthetic batch held at 2°C for 6h still measures
exactly 6.00 exposure hours with `q10` set, identical to `q10: null`.

**Sanity check that this is a true addition, not a silent behaviour
change:** with `q10: null` (or `optimal_temp_c: null`), every weight is
exactly 1 and `computeThermalExposureHours` reproduces the pre-Q10 flat
count exactly — verified directly (6 hourly readings, all above the stress
band, gave 6.00 exposure hours with `q10: null`, versus 23.72 with `q10:
2.5` at 28°C). A commodity with no sourced Q10 behaves exactly as before.

### Did the regime boundaries move? Yes — compressed by almost exactly the Q10 multiplier itself

At this backtest's 28°C ambient assumption, `computeQ10RateMultiplier(28, {
referenceTempC: 13, q10: 2.5 }) = 3.953`. A fine sweep of the real
feasibility formulas (0.05h steps) found the new cliff:

| | Pre-Q10 (original report, below) | Post-Q10 (this session) |
|---|---:|---:|
| SELL/REROUTE infeasibility cliff | ~10.5h | **~2.65–2.70h** |
| DISCOUNT-alone-survives window | ~10.5h–11h (~30 min wide) | **~2.70h–2.80h (~6 min wide)** |
| Total collapse (nothing feasible) | ~12h | **~2.85h+** |

10.5 / 3.953 = 2.657 — the compression factor is, to three figures, *exactly*
the Q10 multiplier computed above. That's expected, not a coincidence: at
a constant 28°C ambient assumption, every stress-hour now costs 3.953x as
much RUL as before, so any threshold defined in RUL-hours is crossed at
1/3.953 the wall-clock time.

**Direct consequence: all four of the original scenarios (6h / 10h /
10h45m / 24h) now sit deep past the new cliff.**

| Scenario | Harvest age | thermalExposureHours (was → now) | Condition | Action mix (was → now) |
|---|---:|---|---|---|
| h06 | 6h | 6.0 → **23.72** | HEALTHY → HEALTHY | SELL 98.9%/REROUTE 1.1% → **NO_FEASIBLE_PATHWAY 100%** |
| h10 | 10h | 10.0 → **39.53** | HEALTHY → HEALTHY | DISCOUNT 99.6%/REROUTE 0.4% → **NO_FEASIBLE_PATHWAY 100%** |
| h10_75 | 10h45m | 10.75 → **42.49** | HEALTHY → HEALTHY | DISCOUNT 100% → **NO_FEASIBLE_PATHWAY 100%** |
| **h24 (primary)** | 24h | 24.0 → **94.87** | HEALTHY → **MODERATE** | NO_FEASIBLE_PATHWAY 100% → **NO_FEASIBLE_PATHWAY 100%** (unchanged, already collapsed) |

The primary scenario's headline number is **unchanged**
(`NO_FEASIBLE_PATHWAY` 100%, Δ=0) — it was already past both the old and
new cliff. But h06 and h10 both **flip from "meaningfully different from
the no-decay backtest" to "totally infeasible"** — a genuine, mechanically
caused regime shift, not a rounding change. h24 is also the first scenario
in this whole exercise where `batchCondition` actually reaches **MODERATE**
(qualityScore 52.6) rather than staying pinned at HEALTHY — Q10-weighting
pushed enough effective exposure hours through `baseDecayPointsPerHour` to
finally move that needle within a realistic 24h window, though it makes no
feasibility difference here since RUL was already deeply negative from the
thermal penalty alone.

To avoid a report that now says nothing but "everything is infeasible,"
three new checkpoints were added, recalibrated against the *new* cliff
(~2.7h) the same way the original four were calibrated against the old one
(~10.5h):

| Scenario | Harvest age | thermalExposureHours | Condition | Action mix | Δ vs baseline | Δ% |
|---|---:|---:|---|---|---:|---:|
| h1_q10 | 1h | 3.95 | HEALTHY | SELL 98.9% / REROUTE 1.1% | +₹23,920.69 | +0.124% |
| h2_5_q10 | 2h30m | 9.88 | HEALTHY | **DISCOUNT 99.1%** / REROUTE 0.9% | +₹520,461.70 | +6.175% |
| h2_75_q10 | 2h45m | 10.87 | HEALTHY | **DISCOUNT 100%** | +₹2,655,388.57 | +865.2% |

**The same three-regime structure the original report found still exists —
it just now happens roughly four times faster.** h1_q10 (magnitude-only,
nearly identical to the pre-Q10 h06's 98.9/1.1 split) → h2_5_q10 (DISCOUNT
takes over even though SELL is technically still feasible, same mechanism
as before: a shrinking RUL budget makes DISCOUNT's saleable-quantity
advantage outweigh its price haircut) → h2_75_q10 (SELL/REROUTE cross their
thresholds, DISCOUNT alone survives, 100% of days). The qualitative finding
from the original report is unchanged; only the wall-clock calibration is.

### Is q10 = 2.50 actually the right value for this role?

**No — not without a caveat that should be stated plainly, not silently
accepted.** The seed citation is specific about what was measured: *"Q10
for tomato respiration in the postharvest handling range is commonly cited
around 2.0–3.0; 2.5 used here as the representative midpoint"*
(`scripts/db/seed.ts`, citing Kader (ed.), UC ANR Publication 3311). That is
a **respiration-rate** Q10 — how CO2 production / O2 consumption scales
with temperature. It is now being used here as a **quality-loss-rate** (RUL
burn-rate) Q10 — how fast shelf life is consumed.

These are related but not identical physical quantities. Respiration is the
principal physiological driver of postharvest senescence in a climacteric
fruit like tomato, so using its Q10 as a proxy for quality-loss rate is a
common and defensible engineering approximation — but it is a reuse of a
value measured for one quantity (CO2 evolution) applied to a different one
(an abstracted "RUL-hours consumed" metric this engine invented), not a
directly-measured "quality-loss Q10" or "shelf-life Q10" for tomato. No such
dedicated figure was sourced in this project. Kader's UC ANR 3311 reference
is known to carry separate quality-loss/shelf-life rate tables alongside its
respiration tables for many commodities — if a tomato-specific quality-loss
Q10 exists there, it was not looked up for this session, and using
respiration Q10 in its place is exactly the kind of substitution that
should be flagged rather than quietly treated as equivalent. **This is
inherited, not introduced, by wiring Q10 in** — the seed script's own
comment already labelled the two decay-model parameters derived from this
literature (`quality_floor_fresh/process`, `base_decay_points_per_hour`) as
"engineering estimates... not lab-measured constants." Reusing respiration
Q10 for RUL burn rate is the same category of judgment call, just newly
load-bearing now that a computation actually depends on it.

**Practical implication:** the exact wall-clock cliff locations reported
above (~2.7h) are only as trustworthy as q10=2.5 is for *this* purpose. If
tomato's true quality-loss Q10 differs from its respiration Q10 — plausibly
by some margin, climacteric respiration and visible quality decline don't
track perfectly 1:1 — the compression factor (currently ~3.95x at 28°C)
moves proportionally, and so does every cliff in this report. The
*mechanism* (a sharp, computable cliff whose location scales with
`q10^(ambientC - optimalC)/10)`) is robust to that uncertainty; the specific
hour counts are not.

### Does the 6h UI slider cap still make sense?

**Flagged, not changed, per the constraint.** The scenario simulator's
`thermalExposureHours` slider (`ScenarioDrawer.tsx`, min 0 / max 6 / step 1)
is **completely unaffected by this change** — it's a direct, raw override
fed straight to `telemetry.thermalExposureHours`; the interactive scenario
path never calls `computeConditionAssessment`, so no Q10 weighting ever
touches it. Nothing broke.

But there is now a real, worth-surfacing inconsistency between what that
slider implies and what a REAL telemetry-backed batch can now produce: a
real batch that spent just **6 real hours** above the stress band at a
realistic uncooled ambient temperature (28°C) now computes
`thermalExposureHours = 23.72` — nearly **4x past the slider's own maximum**
— before `computeConditionAssessment` even finishes running. The slider was
calibrated (implicitly, by its 0-6 range and the demo preset values, which
also sit in 0-6) against the OLD flat 1-hour-per-stress-hour model, where 6
raw hours and 6 exposure hours were the same number. They no longer are,
for any batch whose telemetry ever crosses the stress band. Whoever owns
that slider should decide whether it's meant to represent raw stress-hours
(in which case its range is still fine, but its label/tooltip should say
so, since the number it produces once fed through a real batch's
assessment can now be much larger) or Q10-weighted effective hours (in
which case 6 is now a very mild scenario and the range may be worth
widening) — this wasn't decided here, per the task's own instruction not to
change it unilaterally.

---

## Read this first: what "the engine's own decay function" actually is

*(Historical record of the state as of the FIRST session — this claim is no
longer current; see "Q10 wired in" above for what changed and why. Left
here unedited rather than rewritten.)*

The brief for this backtest asked for decay "using the sourced Q10/chilling
parameters." Reading `src/domain/engine/` directly rather than assuming,
that function doesn't exist the way the phrase implies:

- **`commodity.q10` (2.50, cited from Kader (ed.), *Postharvest Technology
  of Horticultural Crops*, UC ANR Publication 3311) is stored and never
  read [AS OF THIS SESSION — now consumed, see above].** `grep -rn "q10"
  src/ scripts/` outside the schema column and the D1 seed comment returns
  nothing **at the time this was written**; the same grep today also
  matches `rul.ts`'s `computeQ10RateMultiplier` and
  `computeConditionAssessment.ts`'s `computeQ10Weight`. No computation in
  this codebase multiplies anything by it **— was true; no longer is.**
- The engine's real RUL model (`rul.ts`) takes exactly two inputs:
  `batch.condition` — a 3-state band (HEALTHY/MODERATE/DEGRADED), each a
  **fixed** multiplier on a flat 96-hour base shelf life — and
  `telemetry.thermalExposureHours`, a **flat** penalty of 8 hours of RUL
  burned per hour of recorded thermal stress. Neither is Q10-scaled or
  temperature-magnitude-scaled.
- `chilling_threshold_c` / `optimal_temp_c` (also sourced, same citation)
  **are** genuinely consumed — but only as a binary stress/no-stress
  classifier, in `computeConditionAssessment`, not as a continuous curve.
  A reading is "stress" if temp < 10°C or temp > 20°C (optimal 13°C + a 7°C
  band); anything in between is free.
- The D1 seed comment for these params admits this directly: *"The engine's
  actual decay model (D1 does not touch it) may scale this by Q10 and
  temperature deviation"* — anticipated, never built.

So this backtest uses exactly what's real and consumed: `chilling_threshold_c`,
`optimal_temp_c`, and `base_decay_points_per_hour` feed
`computeConditionAssessment` (reused unmodified); `q10` is cited in this
report because it was asked for, but flows into nothing. That mismatch
between "sourced" and "consumed" is itself one of this session's findings,
not a detail to bury.

## Headline result: decay modelling changes EVERYTHING about which action wins — including making the primary scenario fully infeasible

| | |
|---|---|
| Window | 2024-07-16 → 2026-09-08 (785 days, 0 skipped) — same as the original backtest |
| Planned / alternate market | Kumbakonam (Uzhavar Sandhai) / Krishnagiri (Uzhavar Sandhai), Deshi — same as the original |
| **Primary scenario** | **24h since harvest, held uncooled (no cold chain)** |
| Primary scenario result | **NO_FEASIBLE_PATHWAY on 785 / 785 days (100%)** |

The direct answer to "does decay modelling change which action wins, or
just the magnitude": **at the primary, most operationally realistic
harvest-age assumption, it changes everything — nothing wins, because
nothing is feasible.** This is not a bug in this backtest; it is the
engine's own real RUL formula, mechanically, given a genuinely ordinary
input (a batch that spent a day outside cold chain, which is the norm for
smallholder Tamil Nadu tomato logistics, not an edge case).

That single number would be a thin report on its own, so three further
scenarios were run at shorter harvest ages to show **why**, and what
happens on the way to that cliff — because the honest full answer is not
"decay changes nothing" or "decay changes everything," it's regime-dependent,
and the regime boundary sits at a specific, computable point in this
engine's arithmetic.

### All four scenarios, side by side

| Scenario | Harvest age | thermalExposureHours | Condition | Action mix | Δ vs baseline | Δ% |
|---|---|---:|---|---|---:|---:|
| h06 | 6h | 6.0 | HEALTHY | SELL 98.9% / REROUTE 1.1% | +₹22,110 | +0.125% |
| h10 | 10h | 10.0 | HEALTHY | **DISCOUNT 99.6%** / REROUTE 0.4% | +₹752,047.54 | +9.741% |
| h10_75 | 10h45m | 10.75 | HEALTHY | **DISCOUNT 100%** | +₹2,448,223.13 | +156.534% |
| **h24 (primary)** | 24h | 24.0 | HEALTHY | **NO_FEASIBLE_PATHWAY 100%** | ₹0 | 0% |

*(Full day-by-day figures: `data/backtest/results-decay-aware.csv`,
`scenario_id` column. Aggregates: `data/backtest/summary-decay-aware.json`.)*

Three regimes, not one number:

1. **Below ~10.5h of thermal-stress exposure — magnitude only.** h06's
   action mix (98.9% SELL / 1.1% REROUTE) is nearly identical to the
   original no-decay backtest's (98.9% / 1.1%) — same days pick REROUTE,
   same relative ranking, only the absolute ₹ figures shift because
   `computeQualityPriceMultiplier` shaves the realizable price. DISCOUNT
   still never wins here, for the same structural reason the original
   report gave: the RUL budget is still large enough that DISCOUNT's fixed
   22% price haircut always costs more than the little bit of extra
   saleable quantity it buys back.
2. **~10.5h–12h — DISCOUNT wins, and not narrowly.** At h10, SELL is still
   *feasible* (resultingRUL 8h > the 4h threshold) but **DISCOUNT wins
   anyway**, on 99.6% of days. The mechanism is not "SELL got knocked out" —
   it's that at this RUL level, the 2-hour market-dwell difference between
   SELL and DISCOUNT has become a much larger slice of a much smaller RUL
   budget, so DISCOUNT's quality/saleable-quantity advantage (62.5%
   saleable vs SELL's 50%) outweighs its 22% price haircut. This is a
   genuine, previously-impossible-to-observe engine behaviour: the original
   no-decay backtest could never surface it because a fresh (HEALTHY, 0h)
   batch never has a small enough RUL budget for a 2-hour dwell difference
   to matter. At h10.75, SELL and REROUTE (which shares SELL's timeline)
   have both crossed their own feasibility thresholds, leaving DISCOUNT the
   *only* feasible fresh-channel pathway — 100% of days.
3. **≥ ~12h — everything dies together.** Once `thermalExposureHours × 8`
   exceeds the 96-hour base budget by enough margin, SELL, DISCOUNT and
   REROUTE all cross their thresholds within about 90 minutes of each other
   (see breakeven table below) — there is no wide band where "only PROCESS
   survives" or similar; PROCESS's own -6h floor is also crossed by h≈12,
   and it is separately blocked by capacity in the real-data run regardless
   (see Facilities section). Past that point the batch is a pure loss:
   `baselineValueInr` at h24 is **-₹1,350/day** (transport + handling cost
   on zero saleable product) on every single day, and since nothing is
   feasible, `evaluateDecision()`'s own fallback (`recommendedValue ??
   baselineValue`) makes the engine's value identical to that loss —
   `deltaInr = 0` is not "no effect," it's "there was nothing left to
   recover."

### Mechanical breakeven table (computed directly from `rul.ts` / `feasibility.ts`, not a day-by-day replay)

Continuous, ambient (28°C, uncooled) exposure, HEALTHY-condition-banded
throughout this range (condition only degrades to MODERATE past ~120h, see
below) — `resultingUsefulLifeHours` / feasible, per hour of harvest age:

| Hours since harvest | currentRUL | SELL (thresh. 4h) | DISCOUNT (thresh. 2h) | REROUTE (thresh. 3h) | PROCESS (thresh. -6h) |
|---:|---:|---|---|---|---|
| 0 | 96.0 | 88.0 ✅ | 90.0 ✅ | 88.0 ✅ | 89.0 ✅ |
| 6 | 48.0 | 40.0 ✅ | 42.0 ✅ | 40.0 ✅ | 41.0 ✅ |
| 10 | 16.0 | 8.0 ✅ | 10.0 ✅ | 8.0 ✅ | 9.0 ✅ |
| **10.5** | 12.0 | 4.0 ❌ | 6.0 ✅ | 4.0 ✅ | 5.0 ✅ |
| **10.75** | 10.0 | 2.0 ❌ | 4.0 ✅ | 2.0 ❌ | 3.0 ✅ |
| **11.0** | 8.0 | 0.0 ❌ | 2.0 ❌ | 0.0 ❌ | 1.0 ✅ |
| **12.0** | 0.0 | -8.0 ❌ | -6.0 ❌ | -8.0 ❌ | -7.0 ❌ |
| 24 | -96.0 | -104.0 ❌ | -102.0 ❌ | -104.0 ❌ | -103.0 ❌ |
| 48 | -288.0 | ❌ | ❌ | ❌ | ❌ |
| 120 | -897.6 (condition now MODERATE) | ❌ | ❌ | ❌ | ❌ |

Two things worth being explicit about:

- **SELL and REROUTE die at exactly the same moment** (both consume 8h in
  this backtest's parameterisation — the indicative 6h ETA + 2h market
  dwell is identical for both the planned and alternate market). REROUTE
  never "rescues" a batch SELL can no longer serve, in this setup.
- **The `condition` band (HEALTHY/MODERATE/DEGRADED) barely moves on this
  timescale.** At h=48 (2 full days of continuous ambient stress),
  `qualityScore` is still 76 — just above the 75-point HEALTHY cutoff.
  `condition` doesn't reach MODERATE until ~120h (5 days), and even
  MODERATE's multiplier floor (0.65) or DEGRADED's (0.25) applied to the
  full 96h budget (62.4h / 24h) is still nowhere near tight enough to
  threaten feasibility on its own — it's entirely
  `thermalExposureHours × 8` doing the work. **If this backtest had (as
  originally asked) driven decay through `condition` alone and left
  `thermalExposureHours` at 0 like the original backtest, the result would
  have been indistinguishable from the no-decay backtest for any harvest
  age under ~5 days** — this is stated plainly because it's exactly the
  "assumed harvest-age never gets old enough to matter" outcome the task
  anticipated as a legitimate possibility, and it very nearly is what
  happened, until `thermalExposureHours` was brought in as the other real,
  sourced-parameter-driven engine input.

## Method

### 1. Same market pair, window, and no-lookahead rule as the original

No reason was found to change them — see `docs/backtest/results.md` §1/§5
for how Kumbakonam/Krishnagiri were selected (highest measured continuity,
same `market_type`) and how the no-lookahead SQL predicate works. Reused
verbatim, including the 0 skipped days and the ~2.4% stale-price rate.

### 2. Harvest-age scenarios (the new axis)

For each scenario, a fixed harvest age *H* (hours) is set **once**, not
per-day — matching the original backtest's own "fixed every day" treatment
of `condition = HEALTHY`, just applied to a different fixed value. Synthetic
hourly telemetry readings from *t=0* to *t=H*, all at a constant **28°C**
(assumption below), are fed to `computeConditionAssessment` with the
commodity's real, sourced `optimal_temp_c` (13.00), `chilling_threshold_c`
(10.00), and `base_decay_points_per_hour` (0.500) — queried live from
`commodity`, not hardcoded. The resulting `(thermalExposureHours,
batchCondition)` pair is then held fixed across all 785 real price-days for
that scenario, exactly as `deriveBaselineScenario` already does for a
constant scenario override.

### 3. Documented assumptions

| # | Assumption | Why |
|---|---|---|
| 1 | **28°C constant ambient temperature** for the full harvest-age window, every scenario. | Not measured (no met-station data was pulled this session) — a placeholder, but not an arbitrary one: it's an ordinary uncooled Tamil Nadu ambient temperature, deliberately above the commodity's own sourced stress threshold (20°C = optimal 13°C + the 7°C stress band `computeConditionAssessment` already uses), i.e. it models "no cold chain," the realistic default for this supply chain, not a manufactured worst case. |
| 2 | **Four explicit harvest-age scenarios (6h / 10h / 10h45m / 24h) rather than one number.** | A single probe run before committing to a number showed a sharp feasibility cliff at 10.5–12h (see breakeven table). One N either side of that cliff would have hidden exactly the behaviour worth reporting. 24h is the PRIMARY scenario used for the headline comparison; the others are reported as sensitivity/breakeven context, per the task's "same as the quantity assumption" framing (one documented primary choice), while still surfacing the regime structure honestly. |
| 3 | **`facilities: []` for all four real-data scenarios**, even though `storage_facility` (143 rows) and `processing_facility` (4 rows) are no longer empty. | Every real facility row's economics columns (`cost_per_kg_per_day`, `gate_price_per_kg`, etc.) are NULL. The engine's own real-data mapper (`buildRealBatchBaseline.ts`) coerces a NULL storage cost to **0 — free storage**. Wiring those rows into this backtest would let STORE win purely on a data gap being read as "free," which is the exact "manufacture a cleaner result" failure the task warned against. STORE/PROCESS stay infeasible ("no facility is configured") for the same honest reason as the original backtest, even though DB rows now exist. See the illustrative branch below for what STORE could look like with a real (but placeholder) tariff. |
| 4 | Quantity (1,000 kg), logistics (150 km / 6h / ₹1.1 per kg), REROUTE execution-rights = `true`, demand signal = neutral `MODERATE` — **all reused unchanged from the original backtest.** | Direct comparability was the point; no reason was found to revisit them for this session. |
| 5 | **Illustrative STORE branch runs only at the h06 (pre-cliff) harvest age.** | Running it at h24, where every pathway is already infeasible from RUL alone, would show nothing — "does STORE help" is only a meaningful question when the batch isn't already a total loss for unrelated reasons. |

### 4. Illustrative / synthetic STORE branch — clearly separate, never blended into the headline numbers

Real, source-cited facilities nearest the planned market (queried live from
`storage_facility` where `district = 'Thanjavur'`):

| Facility | Capacity | Cost data |
|---|---:|---|
| Cold Storage, Thanjavur (Thanjavur market committee) | 25,000 kg | NULL |
| **Cold Storage, Valappakudi (Thanjavur market committee)** | 100,000 kg | NULL |

The engine's own `evaluateStore` only ever looks at the *first* matching
`COLD_STORE` facility in context — so the larger-capacity Valappakudi
facility was used, at three explicit **placeholder** tariffs (₹0.10 / 0.25 /
0.50 per kg per day — round numbers, not sourced from anything, flagged as
such in every output row's `dataProvenance: "SYNTHETIC"`).

**Result: STORE never won, at any of the three tariffs, at the h06 harvest
age** — action mix stayed 98.9% SELL / 1.1% REROUTE, byte-for-byte identical
across all three tariffs. This isn't (only) a cost problem — the tariff
sensitivity being completely flat (₹0.10 vs ₹0.50/kg/day made zero
difference) shows STORE isn't losing to SELL on storage cost at all. It's
structural: `evaluateStore`'s fixed 24-hour hold (`STORE_HOLD_HOURS`), even
discounted by the cold-storage decay multiplier (0.2×) to 4.8 effective
hours, plus the facility's own 6h indicative transit and 2h market dwell,
consumes 12.8h of RUL budget before any storage-cost line is even reached —
more than SELL's 8h — and `STORE_PRICE_DEFERRAL_MULTIPLIER` (0.95) further
discounts the eventual sale on top of that. **A real tariff, once sourced,
would matter for exactly how much STORE loses by — not whether it wins**,
at least not against a batch this fresh. (Full data:
`data/backtest/results-decay-aware-store-illustrative.csv`,
`summary-decay-aware.json` → `illustrativeSyntheticStoreOnly`.)

## Comparison against the original no-decay backtest

| | Original (fresh every day) | Decay-aware, primary (24h, uncooled) |
|---|---:|---:|
| Δ vs baseline | +₹25,730.13 | **₹0** |
| Δ% | +0.124% | **0%** |
| Action mix | SELL 98.9% / REROUTE 1.1% | **NO_FEASIBLE_PATHWAY 100%** |

Read together with the h06/h10/h10.75 scenarios above, the complete,
honest answer to "does modelling decay change which action wins, or just
the magnitude":

- **It depends entirely on how old the batch actually is when the decision
  is made — and the transition is sharp, not gradual.** Below ~10.5 hours
  of real thermal stress, it's magnitude only (h06 essentially reproduces
  the original's action mix). Between ~10.5 and ~12 hours it flips hard to
  DISCOUNT — a pathway the original backtest could never surface because
  its always-fresh batch never had a small enough RUL budget. Past ~12
  hours, decay modelling doesn't just change the winner, it removes the
  contest entirely.
- **The originally-anticipated "condition alone might never get old enough
  to matter" outcome very nearly happened** — the condition band barely
  moves on any realistic multi-day timescale (see breakeven table) — and
  would have been the actual, reported finding of this session had
  `thermalExposureHours` not also been driven from the same sourced
  parameters. That it wasn't is the more consequential of the two decay
  channels the engine has, by a wide margin, and is worth flagging to
  whoever owns `THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR` (constants.ts): an
  8-hour RUL burn per hour of stress, calibrated against a UI slider capped
  at 6 hours, produces a near-total collapse the moment that same input is
  driven by a realistic multi-day (rather than single-transit-leg) scenario.

## Limitations (stated explicitly)

1. **28°C is a placeholder, not a measured figure** — see assumption #1.
   Real diurnal/seasonal Tamil Nadu ambient data (or, better, real batch
   telemetry once it exists) would refine every number in this report
   without changing the qualitative regime structure, since the cliff's
   location depends only on total stress-hours, not on which constant
   temperature produced them.
2. **[SUPERSEDED — see "Q10 wired in" at the top of this report.]** `q10`
   was sourced and cited but not used by any computation as of this
   session; a follow-up session wired it into `computeConditionAssessment`
   via a new `rul.ts` function, and it is now load-bearing. Left here,
   struck through in spirit rather than deleted, as part of the same
   before/after record.
3. **STORE/PROCESS remain untested against real economics** — assumption
   #3. The illustrative branch shows what's *possible* to test once real
   tariffs exist, not a real result.
4. **Four scenarios, not a continuous sweep or a true multi-day trajectory
   per batch.** Each scenario applies one fixed harvest age to every day in
   the window, exactly as the original backtest fixed `HEALTHY`/0h — no
   real per-batch telemetry history exists to replay something richer.
5. **Single market pair, same as the original** — see that report's
   Limitations §6 for why this doesn't generalize past Kumbakonam/Krishnagiri
   without further work.
