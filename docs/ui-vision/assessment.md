# FreshRoute — Vision vs. Implementation Assessment

Maps every element of `docs/ui-vision/vision.md` against the current codebase
(`src/app`, `src/components`, `src/domain`, `src/server`, `src/demo`) and the
current data state (live Postgres, queried directly for this assessment).
Read-only inspection — no code changed, no git run.

**This replaces `docs/ui-vision/assessment.md` as it stood after Stage 0's
D0/D1 sessions.** That version is preserved at
`docs/ui-vision/assessment-pre-stage0.md` — it was accurate when written, but
D2, D3, and D4 have since shipped, and it says so throughout ("D2 not
started," "the app reads exclusively from hard-coded arrays," "D4 not
started, empty tables with no writer"). None of that is true anymore. Every
claim below was re-verified directly against the current code and a live
query against the database — not inherited from the old document.

## Categories

| | |
|---|---|
| **A** | Already exists, preserve as-is |
| **B** | Already exists, needs UI/UX evolution |
| **C** | Genuinely missing |
| **D** | Needs new decision-engine/computation logic — data to drive it already exists |
| **E** | Can be implemented now against existing real data — UI/aggregation work only |
| **F** | Blocked on a real-world data source this codebase cannot manufacture (external sourcing, not a coding task) |

## Where Stage 0 actually stands right now

- **D0** (data verification): done, unchanged. Arrivals/demand quantity
  confirmed absent at every source tried — `demand_source = 'ABSENT'` on
  **115,538 / 115,538** `market_price` rows, re-queried directly for this
  assessment. Still 100%, still permanent, not a queue position.
- **D1** (schema + migrations): done, unchanged.
- **D2** (ingestion pipeline): **done.** `market_price` has **115,538** real
  Tamil Nadu tomato rows (re-queried directly), ~26 months.
- **D3** (persistence swap): **done.** Every operational route
  (`/dashboard`, `/batches`, `/batches/[id]`, `/decisions`) is marked
  `export const dynamic = "force-dynamic"` and reads through real
  server-side functions — `getRealBatchDashboardEntries()`,
  `buildRealBatchBaseline()` — backed by Postgres repositories, confirmed by
  reading all four page files directly. `src/demo/` is **not** dead code,
  but its role changed: components still import from it, but only for
  shared **types** (`BatchViewData`, `BatchDashboardEntry`, `DashboardKpis`),
  pure **display helpers** (`buildTemperatureTrend`, `computeDisplayStatus`),
  and the **scenario-simulator's curated presets**
  (`CURATED_SCENARIOS`) — a disclosed, intentional "what-if" overlay on a
  real batch's real baseline, not a hidden fake-data path. Verified by
  grepping every `@/demo` import outside `src/demo/` itself and checking
  what each one actually imports — no component reads the old hard-coded
  batch/market arrays for real-page data anymore.
- **D4** (outcome capture): **done.** Re-queried directly:
  `recommendation` has 5 rows across every status
  (2 ISSUED, 1 ACCEPTED, 1 REJECTED, 1 OVERRIDDEN),
  `recommendation_candidate` has 30 (5 × 6, matching the engine's
  always-six-candidates design), `action_execution` has 2,
  `outcome_record` has 1 — thin, but genuinely populated, not zero. The
  `recommendation_outcomes` SQL view (D1's migration) returns a real,
  fully-joined row end to end: expected ₹50,265.83 → executed SELL →
  realized ₹48,900.50, 42.30 kg loss, a named actual destination. That row
  **is** the vision's own Section 14 worked example, for real, today.
  `RecommendationExecutionPanel.tsx` (not `RecommendationCard.tsx` — that's
  the live, unpersisted preview) implements Accept / Reject / Override /
  Record-outcome against this data via server actions in
  `src/app/(ops)/batches/outcomeActions.ts`, confirmed by reading the full
  component. A CSV export exists at `/api/export/recommendation-outcomes`.
- **Facility economics**: `storage_facility` has 143 real, source-cited rows
  and `processing_facility` has 4 — all still `NULL` on every economics
  column (`cost_per_kg_per_day`/`max_storage_days`/`storage_temp_c` for
  storage; `gate_price_per_kg`/`yield_ratio`/`min_quality_score` for
  processing), re-confirmed by direct query. Confirmed the type-predicate
  fix (`hasCompleteStorageEconomics` / `hasCompleteProcessingEconomics` in
  `buildRealBatchBaseline.ts`) is still in place — both grep to real,
  in-use functions — so these rows are correctly excluded from
  `evaluateDecision()`'s candidate set rather than silently priced at
  zero/free. STORE and PROCESS remain genuinely infeasible for every real
  batch, honestly, not by omission.

So the framing has flipped from the previous assessment: **almost nothing
is now gated on "D2/D3/D4 not started."** What's left gated is either a
genuine future data source (real facility tariffs, real routing/logistics,
real demand signals) or plain UI work against data that already exists.

---

## Summary counts

Counted by tallying every distinguishable table row across the sections
below (not the closing recap tables, which restate rows already counted
here) — a stricter, row-level methodology than the previous assessment
used, so the raw numbers aren't directly comparable; the *direction* of
each change is the meaningful signal.

| Category | Count (approx., by distinguishable element) | Direction vs. pre-Stage-0 assessment |
|---|---|---|
| A — preserve as-is | 37 | Up sharply — every D3/D4-backed element |
| B — needs UI/UX evolution | 16 | Up — several D-items became "data's real, UI isn't built" |
| C — genuinely missing | 4 | Unchanged in substance (frontend/visualization work, untouched) |
| D — needs new engine/computation logic | 1 | Down sharply — only "Avoided spoilage %" remains |
| E — implementable now on real data | 7 | Up — the fastest-growing category |
| F — blocked on an external data source | 6 | Down in kind, not just count — demand signals were always here; facility tariffs, real routing, live integrations, and other-crop data joined it under the tightened D-vs-F split (see the note in Section 9) |

The two headline findings, updated:

1. **The outcome loop is real now, not just architecturally ready.** The
   previous assessment's single biggest caveat — "Section 8's
   Accept/Execute/Override, Section 14's outcome learning, Section 5's
   Value Recovered / Spoilage Avoided KPIs all require D4, which hasn't
   started" — no longer holds. D4 shipped. The mechanism is real, exercised
   with real rows, and the vision's own worked example is now a real
   database row, not a schema waiting for data.
2. **What's left in category F has shrunk to almost nothing, and what
   remains is a genuinely different kind of gap** than before: not "the
   backend work hasn't started," but "a UI element hasn't been built yet
   against data that already exists" (now **E**, the fastest-growing
   category), or "a data source doesn't exist and may never
   (`demand_source`, real facility tariffs)," which is a permanent
   characteristic of this problem space, not a sequencing gap.

---

## Product / Core Narrative (intro, "Product Experience," "Core Product Narrative")

| Element | Category | Evidence |
|---|---|---|
| Product definition: AI decision-support for perishable supply chains, TN tomato focus | **A** | Unchanged, now backed by real TN tomato price data end to end rather than just a schema/seed comment. |
| "Serious operational intelligence platform, not generic SaaS" visual personality | **B** | Unchanged — dark, fixed industrial theme confirmed still in place (`src/app/globals.css`); still spare/utilitarian rather than "premium/cinematic." No frontend visual work has happened since the last assessment. |
| Avoid-list (glassmorphism, gradients, glow, decorative AI effects, generic AI marketing copy) | **A** | Re-confirmed by reading `DemoBanner.tsx` and every panel component touched during this pass — no gradients/blur/glow anywhere, restraint intact. |
| "PERISHABILITY IS A CLOCK" as the explicit narrative frame | **B** | Unchanged — root page still carries the related-but-not-literal "Every hour changes the value of fresh produce" line. |

---

## 1. Cinematic Landing / System Introduction

No frontend work has happened here since the previous assessment — every row is unchanged.

| Element | Category | Evidence |
|---|---|---|
| An entry screen distinct from the operational app | **A** | `src/app/page.tsx` still deliberately outside `AppShell`. |
| Hero headline + primary CTA into the product | **B** | Unchanged. |
| FARM → COLLECTION → CONDITION → MARKET → DECISION visual pipeline | **B** | Unchanged — the footer's `Condition · Market · Logistics · Economics → Decision` chip row is the same seed as before. |
| Cinematic visual assets, purposeful motion | **C** | Unchanged — no asset pipeline, no motion on this page. |
| Seamless intro → product transition | **E** | Unchanged — pure frontend work, no backend dependency, now or before. |

---

## 2. Batch Intelligence

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| Single-page, consolidated batch state | **A** | `/batches/[id]` → `BatchWorkspace.tsx` still assembles everything on one page — now from a real `buildRealBatchBaseline()` baseline instead of a demo-array lookup. | No (was already A; now backed by real data) |
| Batch ID, product, quantity, current plan, location | **A** | `BatchHeader.tsx` — unchanged fields, real values. | No |
| Remaining shelf life | **B** | Still hours, not days (`formatHours`) — a display-format choice, unchanged. | No |
| Continuous "condition: 68%" style score | **B** | **Moved from D.** The computation now genuinely exists and runs: `computeConditionAssessment()` (`src/server/assessment/`) computes a real 0–100 `qualityScore` from real telemetry and the commodity's sourced decay parameters, and `condition_assessment.quality_score` is populated (2 real rows, confirmed by query). It's just not displayed as a number anywhere persistent — `ConditionPanel.tsx` still only renders the 3-band categorical `batch.condition` via `StatusPill`; the numeric score currently surfaces only transiently, in `TelemetryForm`'s one-off "Recorded. Derived condition: HEALTHY (quality 97/100)" success message. This is now a UI-surfacing gap, not a missing computation. |
| Market value / projected loss figures | **B** | **Moved from E.** `BatchHeader`'s "Economics" column already shows "Current expected recovery" (`decision.baselineValue`, real) and "Potential recovery range" across feasible candidates — close to, but not literally, the vision's "Market value / Projected loss" pairing. The subtraction to get an explicit "projected loss" figure is still not a named field. |
| "This batch is losing economic value with time" as the framed central problem | **B** | Unchanged — the data now more strongly supports this framing (real RUL, real recovery range) but it's still not stated as one explicit sentence anywhere. |

---

## 3. FreshRoute Decision Engine

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| Real six-pathway economic evaluator | **A** | `src/domain/engine/evaluators.ts` — confirmed unchanged in this pass except one deliberate, narrow addition: `computeQ10RateMultiplier` in `rul.ts` (a later session wired the commodity's sourced Q10 respiration coefficient into the thermal-exposure calculation — an addition to the RUL model, not a rewrite; every other evaluator function is untouched). Still nothing hard-coded to win. | No (strengthened) |
| Candidates compared, not a single unexplained answer | **A** | Unchanged. | No |
| Mock data structured so it's replaceable without rebuilding the UI | **A** | **This is the headline confirmation of the whole assessment.** The exact separation the old assessment praised as forward-looking architecture — `demo/data` → `buildContext` → engine → components — has now literally happened for the real path: `server/repositories` + `buildRealBatchBaseline` → the same unmodified `buildRealDecisionContext`/`evaluateDecision` → the same components. The prediction came true without a UI rebuild. | No (validated) |
| "MARKET / QUALITY / SHELF LIFE / LOGISTICS / PROCESSING / STORAGE → ENGINE → RECOMMENDED INTERVENTION" as a visual diagram | **C** | Unchanged — the computation is real (more real than before), the input-flow diagram still doesn't exist. |
| "Expected recovery" / "Transport cost" figures | **A** | Unchanged, now real. |
| "Avoided spoilage: 23%" style figure | **D** | Unchanged — still no engine output for this specific comparison; the underlying saleable-fraction math (`economics.ts`) hasn't grown a baseline-vs-actual spoilage comparison. |
| "Confidence: 87%" style numeric figure | **B** | **Moved from D.** A real, deliberately non-calibrated numeric confidence now exists and is persisted: `computeConfidence()` (`recommendationService.ts`) starts at 0.6 and is reduced for named, disclosed reasons (demand-source absence, unverified evidence tier, narrow margin) — explicitly documented in-code as *not* a calibrated ML probability, resolving the previous assessment's flagged tension in the same direction it recommended. **But it is not rendered anywhere in the UI** — `RecommendationExecutionPanel.tsx`'s props carry `recommendation.confidence`, and it is never read in that component's JSX (confirmed by reading the full file). The live-preview `RecommendationCard` still only shows the engine's own qualitative `confidenceStatus: "SIMULATION-LIMITED"`, unchanged. Data exists, is honest, isn't shown. |

> **The old callout still applies, resolved correctly.** The previous assessment flagged that the vision's own "Confidence: 87%" example conflicts with the engine's deliberate refusal to fabricate a calibrated percentage, and recommended keeping the qualitative status or deriving something honest. What shipped is exactly that: a transparent, reason-based indicator that never claims to be a probability. The remaining gap is purely "surface the number that already exists," not "invent one."

---

## 4. Explainable Decision

Unchanged from the previous assessment — already the strongest section then, still is.

| Element | Category | Evidence |
|---|---|---|
| "Why this decision" reasoning | **A** | `buildReasons()` unchanged; now also gets the D4 confidence-reduction reasons appended when a recommendation is persisted (`recommendationService.ts`'s `extraReasons`). |
| Full auditable decision trace | **A** | `DecisionTrace.tsx` unchanged. |
| Checkmark-bullet visual format | **B** | Unchanged. |
| Ranked comparison | **A** | Unchanged. |
| Explicit uncertainty/assumption disclosure | **A** | Unchanged. |

---

## 5. Operational Control Tower

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| "Active batches" / "At risk" metrics | **A** | `KPIGrid.tsx` + `computeDashboardKpis()` — now computed from `getRealBatchDashboardEntries()` (real batches), confirmed by reading `batchListService.ts`. | No (now real) |
| "Value recovered" metric | **E** | **Moved from F.** The data this needs — `outcome_record.realized_value_inr` vs. `recommendation.expected_recoverable_value_inr` — is now real and joinable via the existing `recommendation_outcomes` view (confirmed with a live row). `computeDashboardKpis()` currently exposes only four KPIs (Active batches, At-risk batches, Potential value at risk, Recommendations issued today) — **this metric is not yet computed or added to `KPIGrid`**, confirmed by reading both files in full. With only 1 real outcome row today, the number would be thin but no longer fabricated — this is now a straightforward aggregation query plus a KPI tile, not new architecture. |
| "Spoilage avoided" metric | **E** | **Moved from F.** Same dependency, same status: data path exists (`realized_loss_kg` on `outcome_record`), aggregation/display doesn't. |
| Batches-needing-attention identification | **A** | `/decisions` still filters to `DECISION_REQUIRED`/`AT_RISK`, now against `getRealBatchDashboardEntries()`. |
| Geographic / route map | **C** (component) **/ E** (real geo data) | **Data half moved from E-on-mock to E-on-real**: `market.lat`/`lon` columns still exist in schema; confirmed via `package.json` that **no mapping library has been added** (no Mapbox/Leaflet/deck.gl — unchanged). The map component itself is still a genuine new build (**C**), unchanged from before. |
| Select a batch → inspect full intelligence | **A** | Unchanged, now routes into real data. |

---

## 6. Intervention Comparison

Unchanged in kind from the previous assessment, now running on real data for real batches.

| Element | Category | Evidence |
|---|---|---|
| Side-by-side comparison with expected value | **A** | Unchanged. |
| Recommended option visually distinguished | **A** | Unchanged. |
| Factors: value, cost, spoilage, RUL, feasibility, economics, market conditions | **A** | Unchanged. |
| Factor: numeric confidence / evidence strength | **B** | **Moved from D**, same reasoning as Section 3 — evidence tier still fully surfaced (**A** half unchanged); numeric confidence now real but unrendered (**B** half, was "shouldn't be fabricated" **D**). |

---

## 7. Batch Intelligence Panel

Still functionally Sections 2+3+6 combined on `/batches/[id]`, now real. **A** for coverage, unchanged.

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| Information architecture ordering | **B** | Unchanged — same reasonable-but-not-exact ordering as before. | No |
| Historical market context | **E** | **Moved from F.** `market_price` now holds 115,538 real rows spanning ~26 months for exactly this purpose. `MarketPanel.tsx` (confirmed by reading it in full) still renders only the **latest** snapshot per market in a flat table — no trend, no history, no chart. The data D2 was blocking on is fully loaded; this is now pure UI work. **Also worth flagging while in this file**: `MarketPanel` still carries a hardcoded "Indicative demo value" badge in its header, unconditionally, even when displaying a real, dated modal price (`expectedArrivalConditionNote` elsewhere correctly distinguishes "Real modal price for [date]" from "No price data available" per market — the panel's own badge doesn't reflect that distinction). Minor, but a genuine, precise inconsistency worth a look alongside the historical-context work, since both touch the same component. |

---

## 8. Decision-to-Action Experience

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| "RECOMMENDED ACTION" statement | **A** | Unchanged. | No |
| Destination, ETA, transport cost, expected recovered value | **A** | Unchanged. | No |
| Decision confidence | **B** | Same as Section 3 — real, persisted, not rendered. | Moved from D |
| Expected arrival condition | **B** | Unchanged — still a fixed indicative note string per market, not batch-specific. | No |
| Expected avoided loss | **E** | Unchanged in status — still derivable, still not a named field; now the derivation would draw on real rather than demo baseline values. | No |
| Clear, actionable "what should the operator do next" | **A** | **Moved from B.** This is now a genuinely actionable control, not a static disclaimer sentence: `RecommendationExecutionPanel.tsx` renders live Accept / Reject / Override buttons wired to real server actions (`outcomeActions.ts`), each of which writes a real row and is reflected immediately (`router.refresh()`). Confirmed by reading the full component and its button handlers. |
| **Accept / Execute / Override controls that actually record what happened** | **A** | **Moved from F — this is the single largest category shift in this reassessment.** D4's own scope, verbatim from `STAGE0.md`, is now built and exercised: `action_execution` has 2 real rows, `recommendation.status` cycles through ISSUED → ACCEPTED/REJECTED/OVERRIDDEN, and the Override flow requires naming what was actually executed from `action_type` before it will submit (confirmed in the component's form). Not a mockup — a real, working control surface. |

---

## 9. Data and Intelligence Architecture

| Intelligence category | Element | Category | Notes | Moved? |
|---|---|---|---|---|
| Batch | condition, quality, quantity, shelf life, RUL, telemetry | **A** | Now wired end to end — `batch`, `batch_telemetry`, `condition_assessment` all have real rows, read through `buildRealBatchBaseline`. | Moved from "A (demo)" — now real |
| Market | current/destination prices | **A** | 115,538 real rows, read live via `getLatestMarketPrice`. | Moved from F (real) |
| Market | historical price context | **E** | See Section 7 — data loaded, UI doesn't surface it yet. | Moved from F |
| Market | demand signals | **F, permanent, unchanged** | Re-confirmed by direct query: **100% of `market_price` rows** (115,538 / 115,538) carry `demand_source = 'ABSENT'`. This is the one item in this whole document that is still exactly where the previous assessment left it, correctly — a real data-source absence, not a sequencing gap. Treat "no demand signal" as the permanent normal case, not a temporary one. |
| Logistics | route distance, transport cost, ETA, constraints | **A** (indicative) **/ F** (real) | Unchanged — `lane` table exists, real routing data still hasn't been sourced. Reclassified from D to F in this pass — see the D-vs-F note below the table. |
| Storage | availability, cost, shelf-life extension | **A** (existence, honestly gated) **/ F** (economics) | **Refined, not simply moved.** 143 real, source-cited facility rows now exist (up from 0) — a genuine partial advance over the old assessment's "0 rows" finding — but every economics column is NULL, and (confirmed this session) a type-predicate fix correctly excludes these rows from `evaluateDecision()` rather than pricing them at zero. STORE is real, honestly infeasible, and correctly explained as such (`"No cold-store facility is configured for this batch."`) rather than either fabricated or silently broken. The remaining gap is sourcing real tariffs — external data acquisition, not a coding task — hence **F**, not D. |
| Processing | availability, capacity, economics | **A** (existence, honestly gated) **/ F** (economics) | Same pattern — 4 real rows, same fix in place, same honest infeasibility, same F reclassification. |
| Decision | candidates, ranking, expected value/loss, confidence, evidence, trace | **A** | Unchanged as the most complete category — now backed by real data and a real persistence/execution/outcome loop on top. |

> **A note on D vs. F in this revision.** The previous assessment used D for "backend/engine work not started" broadly, covering both "a new formula needs to be written" and "real-world data needs to be sourced from somewhere" — a distinction that didn't matter much while D2–D4 themselves were the biggest pending backend work. Now that they're done, lumping those two together would hide a real difference: **D** here means *new computation this codebase's own team can write* (e.g., "Avoided spoilage %" above — the math is derivable from data already in hand); **F** means *blocked on acquiring a real-world data source this codebase cannot manufacture* (facility tariffs, real routing distances, live integrations) — the same category demand signals were already correctly in. Storage/processing economics and real logistics data move from D to F under this tightened definition; nothing about their actual status changed, only which bucket honestly describes what's missing.

---

## 10. Realistic Data Philosophy

Unchanged as a *principle*, and now tested under real conditions rather than only against demo data — it held.

| Element | Category | Evidence |
|---|---|---|
| Structured mock data with realistic relationships | **A** | Unchanged for the demo layer; the real layer inherits the same discipline. |
| Replaceable data layer | **A** | **Validated, not just claimed** — see Section 3. The swap actually happened without an engine or component rewrite. |
| Business logic not hard-coded into visual components | **A** | Re-confirmed while reading every component touched this session. |
| Calculations eventually sourced from the real decision engine | **A** | Was already true; now the *inputs* are real too, not just the calculations. |
| Never implying production-grade prediction where it doesn't exist | **A** | `DemoBanner.tsx`'s copy has itself been kept honestly current — it now reads "Real market prices (market_price) · manually entered telemetry · indicative logistics & facilities," correctly distinguishing what's real from what isn't rather than blanket-labeling everything synthetic. This is exactly the discipline Section 10 asks for, caught actively maintaining itself through a real data transition — worth naming as a positive finding, not just a box to check. |

---

## 11. Animation and Interaction Philosophy

No frontend work here since the previous assessment — unchanged.

| Element | Category | Evidence |
|---|---|---|
| Motion for decision computation / value changes / list reordering | **A** | Unchanged. |
| Non-decorative, functional animation | **A** | Unchanged. |
| Motion for batch movement / route selection / deterioration over time | **C** | Unchanged. |
| "Responsive, deliberate, premium, calm, intelligent, operational" feel | **B** | Unchanged. |

## 12. Visual Hierarchy

**B**, unchanged — economic risk still isn't a distinct, prominent first-class element on the batch page itself (it's stronger now, in `BatchHeader`'s Economics column, but still not foregrounded the way the vision's second-priority ordering implies).

## 13. Product Personality

**B**, unchanged — same restraint-achieved / ambition-not-yet-reached split as before. No code contradicts the vision; the cinematic/premium half simply hasn't been built.

## 14. Long-Term Product Direction

| Element | Category | Evidence | Moved? |
|---|---|---|---|
| Multi-crop support (architecture) | **A** | Unchanged — engine and types remain commodity-agnostic. | No |
| Multi-crop support (real data) | **F** | Unchanged in substance — D0–D4's real pipeline is still TN-tomato-only by explicit scope; reclassified from D to F (external data sourcing for other crops, not new code, per the note in Section 9). | No |
| Real-time telemetry, live market intel, logistics/processor/storage integrations | **F** | Unchanged in substance — none of these are live-streaming; telemetry is manually entered (`TelemetryForm`), prices are a nightly-style loaded table, not a live feed. Reclassified from D to F — these are external integrations to acquire, not computation to write. | No |
| Historical outcome learning, recommendation performance tracking, intervention success rates, recovered-value analytics | **E** | **Moved from F.** The prerequisite data now exists and is queryable in one view (`recommendation_outcomes`) — confirmed with a real row. What's missing is an aggregation/analytics UI (success rate, average expected-vs-actual delta across the outcome set) — a real but small build against real data, not a new capability to invent. With 1 outcome row today the numbers would be thin, which is honest, not a blocker. |
| "Recommendation → Processing, Expected ₹31,260, Actual ₹30,840, Outcome: Successful" worked example | **A** | **Moved from F — the clearest single confirmation in this document.** This is no longer a hypothetical schema shape. A real row exists: Recommendation → SELL, Expected ₹50,265.83, Actual ₹48,900.50 (realized 42.30 kg loss, a named actual destination), reachable today via the `recommendation_outcomes` view or the CSV export. Different action, different numbers, same real mechanism the vision describes. |

## 15. Design Principle ("Show the intelligence, not just the interface")

**A**, unchanged and now stronger — `DecisionTrace` still answers the vision's framing questions on demand, and the outcome loop now closes the last one ("what should I do now?" → an actual, persisted, re-visitable answer) that was previously only architecturally implied.

## 16. Implementation Direction ("evolve, don't rebuild")

Unchanged as a constraint, and now validated as a result: `src/domain/engine` remains genuinely framework-free (re-confirmed: the only change made to it since the previous assessment was one small, additive, pure function — `computeQ10RateMultiplier` — no DB/HTTP import was introduced), and D2/D3/D4 were built entirely as new adapters/repositories/services around it rather than by touching it. The evolve-don't-rebuild bet paid off exactly as the previous assessment predicted.

## 17. Core Experience Summary

Re-scored against the same spine — **DATA → INTELLIGENCE → DECISION → EXPLANATION → ACTION → OUTCOME**:

- **DATA**: real for D0's measurement, **now also real for the running app** (D2 loaded). Only demand signals remain permanently synthetic-by-necessity.
- **INTELLIGENCE → DECISION → EXPLANATION**: real, unchanged, still the strongest part of the product.
- **ACTION**: **now real** — Accept/Reject/Override genuinely execute and persist.
- **OUTCOME**: **now real, thin** — one genuine outcome row exists end-to-end; the loop closes, the volume is just still small.

The entire spine is now real, if not yet deep everywhere. The previous assessment's one structurally-blocked segment (ACTION → OUTCOME, "can't be built until D4") is the segment that moved the most.

---

## Every formerly-F item, resolved explicitly

Per the task's ask — every element the previous assessment marked **F**, and exactly what happened to it:

| Vision element | Was blocked on | Now | Why |
|---|---|---|---|
| "Value recovered" KPI (Section 5) | D4 | **E** | `outcome_record`/`recommendation_outcomes` now real and queryable; `KPIGrid`/`computeDashboardKpis` confirmed to not yet compute it — pure aggregation + tile work remains. |
| "Spoilage avoided" KPI (Section 5) | D4 | **E** | Same — `realized_loss_kg` is real; not yet aggregated or displayed. |
| Historical market context (Sections 7, 9) | D2 | **E** | 115,538 real rows loaded; `MarketPanel` confirmed to still show only the latest snapshot, no trend. |
| Real demand signals (Section 9) | D0 finding, not a queue position | **F, unchanged, correctly** | Re-confirmed 100% `ABSENT` across all 115,538 rows. Still a genuine, likely-permanent data-source absence — the one item that should stay F. |
| Accept/Execute/Override controls (Section 8) | D4 | **A** | Built, wired, exercised with real rows (`action_execution` has 2). The largest single move in this reassessment. |
| Outcome learning / performance tracking / success-rate analytics (Section 14) | D4 | **E** | Data path real and joined (`recommendation_outcomes`); an aggregate analytics view over it doesn't exist yet — thin data (1 outcome), honest to report as such. |
| "Actual recovery ₹30,840 / Outcome: Successful" worked example (Section 14) | D4 | **A** | This is now a literal, real `recommendation_outcomes` row — not the same numbers, but the same mechanism, for real. |
| Persisted, queryable candidate/decision history (Sections 4, 6, 9) | D3 | **A** | `recommendation_candidate` has 30 real rows (5 recommendations × 6 candidates); no longer just live-recomputed-per-render with nothing durable behind it. |
| "Expected arrival condition" as a batch-specific, computed figure (Section 8) | D3 | **B** | Context builder now reads real telemetry (D3 done), but `expectedArrivalConditionNote` is still a fixed indicative string per market in `buildRealDecisionContext.ts`, not computed per batch. Moved from fully-blocked to a scoped UI/logic task. |

**Several items remain genuinely F under the tightened D-vs-F definition above — none blocked by sequencing, all blocked by a real-world data source this codebase cannot manufacture:**

1. **Real demand signals** — a confirmed, structural data-source absence (Section 9): 100% `ABSENT` across all 115,538 `market_price` rows, not a pending task.
2. **STORE/PROCESS real economics** (Sections 3, 6, 9) — real facility *existence* is now known (**143** storage + 4 processing rows, source-cited, direct-queried for this assessment — not the 147 the task brief cited; noting the discrepancy rather than silently adopting it), but real *tariffs* have never been sourced, and nothing in this codebase can manufacture them honestly.
3. **Real logistics/routing data** (Section 9) — the `lane` table exists; every distance/ETA/cost figure in the running app is still the same indicative placeholder.
4. **Real-time telemetry, live market intelligence, logistics/processor/storage integrations** (Section 14) — telemetry is manually entered, prices load in batch, nothing streams.
5. **Multi-crop real data** (Section 14) — the engine and schema are commodity-agnostic already; every real row in the database is still tomato-only.

Compare this list with the previous assessment's nine F items: three of those (Value recovered, Spoilage avoided, Accept/Execute/Override — the ones actually gated on D4) are gone, resolved by real work landing. What's left is a shorter, more honest list of genuine external-data dependencies, not a queue.
