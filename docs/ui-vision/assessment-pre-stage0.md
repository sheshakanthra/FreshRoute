# FreshRoute — Vision vs. Implementation Assessment

Maps every element of `docs/ui-vision/vision.md` against the current codebase
(`src/app`, `src/components`, `src/domain`, `src/demo`) and the current data
state (`STAGE0.md`, `docs/data/schema-notes.md`,
`docs/data/schema-implications.md`, `docs/data/validation-report.md`).
Read-only inspection — no code changed, no git run.

## Categories

| | |
|---|---|
| **A** | Already exists, preserve as-is |
| **B** | Already exists, needs UI/UX evolution |
| **C** | Genuinely missing |
| **D** | Requires backend / data / decision-engine work not yet started |
| **E** | Can be implemented now against existing mock data |
| **F** | Defer until Stage 0 is further along (D2/D3/D4-gated) |

## Where Stage 0 actually stands right now

This matters for almost every F below. As of this assessment:

- **D0** (data verification): PARTIAL. Real TN tomato price data was pulled
  and measured (`docs/data/validation-report.md`), but **arrivals/demand
  quantity is confirmed absent at every source tried** — not sparse, absent.
  `demand_source` will be `ABSENT` on effectively 100% of real rows.
- **D1** (schema + migrations): done. 17 tables exist in the live Neon
  database, including `recommendation`, `recommendation_candidate`,
  `action_execution`, and `outcome_record` — but **nothing writes to any of
  them yet**. `market_price` has 0 rows (D2 loads it).
- **D2** (ingestion pipeline): not started. No real prices are in the app.
- **D3** (persistence swap): not started. The app reads **exclusively** from
  hard-coded arrays in `src/demo/data/*` — there is no database call
  anywhere in `src/app`, `src/components`, or the engine's call path.
- **D4** (outcome capture): not started. `action_execution` and
  `outcome_record` are empty tables with no writer.

So: **every UI element below that implies persisted recommendation history,
executed actions, or realized-vs-expected outcomes is gated on D3 and/or
D4**, regardless of how simple it looks visually. These are marked **F** and
called out again in their own section at the end.

---

## Summary counts

| Category | Count (approx., by distinguishable element) |
|---|---|
| A — preserve as-is | 15 |
| B — needs UI/UX evolution | 11 |
| C — genuinely missing | 7 |
| D — backend/engine work not started | 9 |
| E — implementable now on mock data | 5 |
| F — Stage-0-gated | 9 |

The two headline findings:

1. **The decision engine, explainability, and "realistic data" discipline the
   vision asks for are already real and unusually well-built** — they are
   the strongest part of this codebase, not a gap. `evaluateDecision()` is a
   genuine, framework-free, six-pathway economic evaluator
   (`src/domain/engine/`), and `DecisionTrace.tsx` already exposes exactly
   the input → feasibility → value → ranking → explanation → provenance
   chain the vision describes in Section 4 and Section 15.
2. **Everything visual/cinematic (Section 1), geographic (Section 5's map),
   and outcome-loop (Sections 5, 8, 14) is missing or gated**, and these are
   three structurally different kinds of "missing": Section 1 is a pure
   frontend build (no backend dependency, **E/C**), Section 5's map needs a
   new capability plus geo data that doesn't exist even in mock form
   (**C**), and the outcome loop cannot be honestly built until D4 exists
   (**F**) — building it now would mean fabricating the exact kind of number
   the vision's own Section 10 prohibits.

---

## Product / Core Narrative (intro, "Product Experience," "Core Product Narrative")

| Element | Category | Evidence |
|---|---|---|
| Product definition: AI decision-support for perishable supply chains, TN tomato focus | **A** | `README.md`; `docs/data/schema-notes.md` seeds `commodity.code = 'TOMATO'`; entire demo dataset and D0 pull are TN-tomato-first |
| "Serious operational intelligence platform, not generic SaaS" visual personality | **B** | Dark, fixed (no light mode) industrial theme already exists (`src/app/globals.css:56-100`), explicitly documented as deliberate ("this is a fixed, always-dark industrial control surface, not a themeable consumer product"). Foundation is right; execution is still spare/utilitarian, not yet "premium/cinematic." |
| Avoid-list (glassmorphism, gradients, glow, decorative AI effects, generic AI marketing copy) | **A** | Confirmed by reading every component: no gradients, no blur/glass, no glow. `DemoBanner.tsx` comment is explicit: "not a warning banner — no alarming color, no dismiss action, no apology copy." This restraint is already a house style. |
| "PERISHABILITY IS A CLOCK" as the explicit narrative frame | **B** | Root page (`src/app/page.tsx:31-33`) has a *related* line ("Every hour changes the value of fresh produce") but not the literal clock framing or the time-pressure visual treatment the vision describes. |

---

## 1. Cinematic Landing / System Introduction

| Element | Category | Evidence |
|---|---|---|
| An entry screen distinct from the operational app | **A** | `src/app/page.tsx` is deliberately not wrapped in `AppShell` (`AppShell.tsx:6-10` comment: "The entry screen at '/' does not use this shell; it is the product intro, not an operations view.") |
| Hero headline + primary CTA into the product | **B** | Exists (`FreshRoute` / "Every hour changes the value of fresh produce" / "ENTER OPERATIONS" button), functionally equivalent to the vision's hero + "Explore the system" CTA, but plain centered text — no cinematic treatment. |
| FARM → COLLECTION → CONDITION → MARKET → DECISION visual pipeline | **B** | A schematic seed exists: the footer renders `Condition · Market · Logistics · Economics → Decision` as bordered chips (`page.tsx:8, 50-61`) — same idea, different/fewer stages, purely textual. Not a supply-chain visual narrative. |
| Cinematic visual assets, purposeful motion showing origin/collection/transport/condition change/time pressure | **C** | Nothing exists. No video/image asset pipeline, no `framer-motion` usage on this page at all (it's used elsewhere — `RankingList`, `RecommendationCard`, `EventTimeline` — just not here). |
| Seamless intro → product transition | **E** | Pure routing/animation work against the existing `/dashboard` link; no backend dependency. |

---

## 2. Batch Intelligence

| Element | Category | Evidence |
|---|---|---|
| Single-page, consolidated batch state (no hunting across screens) | **A** | `/batches/[id]` → `BatchWorkspace.tsx` already assembles header, condition, logistics, market, decision engine, timeline, and recommendation on one page from one computed `BatchViewData`. |
| Batch ID, product, quantity, current plan, location | **A** | `BatchHeader.tsx:36-52` |
| Remaining shelf life | **A** | `computeCurrentRemainingUsefulLifeHours()` (`src/domain/engine/rul.ts`), surfaced in `BatchHeader` and `ConditionPanel`. Vision shows it in days (4.7 days); engine currently outputs/formats hours (`formatHours`) — a formatting change, not new logic — **B** for the days-vs-hours display choice specifically. |
| Continuous "condition: 68%" style score | **D** | The engine's `BatchCondition` is a **3-step categorical enum** (`HEALTHY / MODERATE / DEGRADED`, `src/domain/types/enums.ts`), not a continuous percentage. A real 0–100 quality score requires new engine logic. Notably, **the D1 database schema already has the right column for this** — `condition_assessment.quality_score numeric(5,2)` (`src/db/schema/batch.ts`) — but nothing computes or writes to it yet. This is real decision-engine work, independent of D2/D3/D4. |
| Market value / projected loss figures | **E** | Not currently exposed as named fields, but **fully derivable today from existing computed values**: `grossPlannedValue` (quantity × indicative base price, already computed in `dashboardDecisions.ts:37`) minus `decision.baselineValue` (already computed by the engine) = projected loss. No new backend or data needed. |
| "This batch is losing economic value with time" as the framed central problem | **B** | The data to show this exists (RUL ticking down, uplift/baseline deltas); it isn't yet framed as a single explicit statement anywhere in the UI. |

---

## 3. FreshRoute Decision Engine

| Element | Category | Evidence |
|---|---|---|
| Real six-pathway economic evaluator (SELL/DISCOUNT/DIVERT/REROUTE/STORE/PROCESS) | **A** | `src/domain/engine/evaluators.ts` — genuinely computes feasibility, path-aware RUL, and `expectedRecovery` per pathway from the actual context; nothing hard-coded to win (confirmed by reading all six functions). This is the strongest asset in the codebase relative to the vision. |
| Candidates compared, not a single unexplained answer | **A** | `RankingList` / `PathwayCard` render all six, feasible and infeasible, with rank, cost, risk, evidence tier. |
| Mock data structured so it's replaceable without rebuilding the UI | **A** | Clean separation: `src/demo/data` (raw mock entities) → `src/demo/scenarios/buildContext.ts` (assembly into `DecisionContext`) → `src/domain/engine` (pure, framework-free) → components (read only typed engine output). This is precisely what vision Section 10 asks for, already built. |
| "MARKET / QUALITY / SHELF LIFE / LOGISTICS / PROCESSING / STORAGE → ENGINE → RECOMMENDED INTERVENTION" as a **visual diagram** | **C** | The computation exists; the diagram/visualization of inputs flowing into the engine does not. `DecisionEngine.tsx` renders straight to the ranking list, no input-flow visual. |
| "Expected recovery" / "Transport cost" figures | **A** | `RankedAction.expectedRecovery`, `PathwayCard`'s cost figure. |
| "Avoided spoilage: 23%" style figure | **D** | Not computed anywhere today. Derivable in principle from saleable-fraction math (`computeFreshSaleableFraction` / `computeProcessSaleableFraction` in `economics.ts`) versus a spoiled/baseline case, but that comparison doesn't exist as an engine output yet — new engine logic, not just new UI. |
| "Confidence: 87%" style numeric figure | **D — and a product decision, not just an implementation gap** | See the callout below. The engine deliberately does **not** produce a calibrated percentage — `confidenceStatus` is a single-value enum, `"SIMULATION-LIMITED"` (`src/domain/types/enums.ts`, `evaluateDecision.ts:49,73`). This is intentional (README: "never presented as a calibrated, [percentage-style confidence]"). |

> **Flag — the vision's own example conflicts with an existing, deliberate design principle.** Vision Section 10 ("Realistic Data Philosophy") explicitly warns against "presenting arbitrary numbers as if they were authoritative real-world predictions" — and a fabricated 87% is exactly that. The current codebase already resolved this tension in Section 10's favor. Recommend keeping `SIMULATION-LIMITED` (or a qualitative confidence band derived honestly from margin/evidence-tier data, which *is* implementable) rather than inventing a percentage to match the vision doc's illustrative mockup literally.

---

## 4. Explainable Decision

| Element | Category | Evidence |
|---|---|---|
| "Why this decision" reasoning, grounded in real inputs | **A** | `RecommendationCard.tsx:85-97` renders `decision.reasons[]`, which `buildReasons()` (`src/domain/engine/reasons.ts`) derives directly from the winner's and baseline's actual computed RUL/price/value — not templated per scenario. |
| Full auditable decision trace (inputs → feasibility → value calc → ranking → explanation → provenance → engine version) | **A** | `DecisionTrace.tsx` is essentially a direct implementation of this vision section already — every one of the vision's six bullet points ("what did it observe / what alternatives / why did it rank highest / what outcome / what assumptions") has a corresponding `TraceSection`. |
| Checkmark-bullet visual format ("✓ Remaining shelf life is below 5 days") | **B** | Content equivalent exists as prose reasons; not styled as a checklist. Cosmetic evolution only. |
| "Therefore: PROCESSING > MARKET > STORAGE" ranked comparison | **A** | `DecisionTrace`'s "Ranking" section and `RankingList` already show exactly this, with rank, score, and Δ-to-winner. |
| Explicit uncertainty/assumption disclosure | **A** | `AssumptionFlag.tsx`, `EvidenceBadge.tsx`, `ASSUMPTION_FLAG_TEXT` constants — REROUTE/STORE/PROCESS are visibly flagged `PLAUSIBLE_UNVERIFIED` everywhere they appear, never presented as field-validated. Matches vision Section 4's "what assumptions or uncertainty exist" precisely. |

This is the vision section the current implementation already satisfies most completely.

---

## 5. Operational Control Tower

| Element | Category | Evidence |
|---|---|---|
| "Active batches" / "At risk" metrics | **A** | `KPIGrid.tsx` + `computeDashboardKpis()` (`dashboardDecisions.ts:51-60`) |
| "Value recovered" metric | **F** | Requires comparing `outcome_record.realized_value_inr` against `recommendation.expected_recoverable_value_inr` over real executed batches. `outcome_record` has zero rows and no writer (D4 not started). A demo-only mocked version would be indistinguishable from the real metric to a viewer — building it now risks presenting fabricated recovery figures as if real, which the vision's own Section 10 explicitly warns against. |
| "Spoilage avoided" metric | **F** | Same dependency — needs realized outcomes vs. baseline-no-intervention comparison, i.e. `outcome_record` populated by D4. |
| Batches-needing-attention identification | **A** | `/decisions` page already filters to `DECISION_REQUIRED` / `AT_RISK` (`src/app/(ops)/decisions/page.tsx:17-19`). |
| Geographic / route map ("HOSUR ↓ KRISHNAGIRI ↓ BENGALURU") | **C** (component) **/ E** (mock geo data) | No mapping library in `package.json` (no Mapbox/Leaflet/deck.gl), no map component anywhere. **However**: `market`, `storage_facility`, and `processing_facility` all already have `lat`/`lon` columns in the D1 schema (`src/db/schema/market.ts`, `facilities.ts`) — currently unpopulated even in demo data (`src/demo/data/markets.ts` and `facilities.ts` carry only `distanceKm`/`etaHours`, no coordinates). Plausible real TN-town coordinates could be added to the mock layer now (that's indicative geography, not fabricated business data) without needing D2/D3. The map *rendering component* itself is a genuine new build (**C**). |
| Select a batch → inspect full intelligence | **A** | Table/list rows already route to `/batches/[id]` (`BatchTable.tsx:46-49`, `decisions/page.tsx:47-49`). |

---

## 6. Intervention Comparison

| Element | Category | Evidence |
|---|---|---|
| Side-by-side comparison of interventions with expected value | **A** | `RankingList`/`PathwayCard` — functionally a comparison table already (rank, action, evidence, feasibility, expected recovery, cost, risk), just card-formatted rather than a literal `<table>`. If a literal table layout matters for the vision's specific mockup, that's **B** (formatting only). |
| Recommended option visually distinguished | **A** | `RecommendationCard` is a separate, primary-bordered, sticky panel distinct from the ranked list; rank-#1 styling in `PathwayCard`. |
| Factors: expected value, transport cost, spoilage, RUL, route feasibility, processing/storage economics, market conditions | **A** | All present across `PathwayCard`, `DecisionTrace`, `MarketPanel`. |
| Factor: numeric confidence / evidence strength | **D** | Evidence *tier* (qualitative, VERIFIED/PLAUSIBLE_UNVERIFIED) exists and is well-surfaced (**A** for that half); numeric confidence does not, and shouldn't be fabricated — see the Section 3 callout above. |

---

## 7. Batch Intelligence Panel

Functionally this section restates Sections 2+3+6 as one consolidated panel. The current `/batches/[id]` page already **is** this panel — `BatchHeader` + `ConditionPanel` + `LogisticsPanel` + `MarketPanel` + `DecisionEngine` + `RecommendationCard` + `DecisionTrace` together cover essentially every bullet in the vision's list (batch ID, origin, product, quantity, condition, temperature, humidity, RUL, market price, transport cost, destinations, processing/storage options, recommendation, evidence, explanation, decision trace). **A** for coverage.

| Element | Category | Evidence |
|---|---|---|
| Information architecture: current state → options → recommendation → why → expected outcome | **B** | Current order is close (Header/Condition/Logistics → Market → all-candidates DecisionEngine → EventTimeline → sticky RecommendationCard-with-why) but "why" and "expected outcome" live inside the sticky recommendation rail rather than as sequential steps down the page. Reasonable existing IA; could be tightened to match the vision's exact reading order. |
| Historical market context | **F** | Needs D2 (real price history loaded into `market_price`) — see Section 9 below. |

---

## 8. Decision-to-Action Experience

| Element | Category | Evidence |
|---|---|---|
| "RECOMMENDED ACTION" statement | **A** | `RecommendationCard.tsx:41-43` |
| Destination, ETA, transport cost, expected recovered value, confidence | **A/D mix** | All present except numeric confidence (same flag as Section 3). |
| Expected arrival condition | **B** | Exists at the market level (`MarketPanel`'s "Expected arrival condition" column, currently a fixed indicative note string, not batch-specific) — could be tightened but the field exists. |
| Expected avoided loss | **E** | Same derivation as Section 2's "projected loss" — computable now from existing baseline/candidate values, not currently surfaced as a named field. |
| Clear, actionable "what should the operator do next" | **B** | Currently a static disclaimer sentence ("Operator reviews and executes. FreshRoute does not execute pathways automatically.") — informative but not an actionable control. |
| **Accept / Execute / Override controls that actually record what happened** | **F** | This is precisely D4's scope. `action_execution` (who executed what, when) exists as an empty table with no writer. Building interactive controls now that don't persist anywhere would be UI theater — STAGE0.md's D4 session is explicitly this: "Accept / Reject / Override controls on the recommendation card... Writes action_execution." |

---

## 9. Data and Intelligence Architecture

| Intelligence category | Element | Category | Notes |
|---|---|---|---|
| Batch | condition, quality, quantity, shelf life, RUL, telemetry | **A** (demo) | Modeled in `domain/types/models.ts` (`Batch`, `Telemetry`) and now in the D1 DB schema (`batch`, `batch_telemetry`, `condition_assessment`) — not yet wired together (D3). |
| Market | current/destination prices | **A** (demo) / **F** (real) | Demo prices are scenario-driven synthetic values (`buildContext.ts:27-42`). Real prices exist in `data/validation/normalized/tomato_tn.csv` (126,578 measured rows from D0) but **zero rows are in the database** — D2 hasn't loaded them. |
| Market | historical price context | **F** | Same — needs D2. The raw material is unusually good here (D0 measured ~26 months of dense daily TN tomato history), it's just not loaded yet. |
| Market | demand signals | **F, with a permanent caveat** | Demo `DemandSignal` (WEAK/MODERATE/STRONG) is scenario-controlled synthetic data today. The real path is not just "not started" — D0 found arrivals **absent at every source attempted** (`data/validation/source_attempts.json`), so `demand_source` defaults to `ABSENT` in the schema by design (`docs/data/schema-implications.md`, finding #1). A real demand signal may never arrive without a fundamentally different data source; the engine and UI should keep treating "no demand signal" as the normal case, not a temporary gap. |
| Logistics | route distance, transport cost, ETA, constraints | **A** (demo) / **D** (real) | Demo `Market`/`Facility` types carry these fields already; no real routing/logistics integration exists or is scheduled in STAGE0. |
| Storage | availability, cost, shelf-life extension | **A** (demo) / **D** (real) | `storage_facility` exists in both the demo layer and the D1 DB schema; no real storage-network integration. |
| Processing | availability, capacity, economics | **A** (demo) / **D** (real) | Same pattern as storage. |
| Decision | candidates, ranking, expected value/loss, confidence, evidence, trace | **A** | The most complete category — see Sections 3–4. |

---

## 10. Realistic Data Philosophy

| Element | Category | Evidence |
|---|---|---|
| Structured mock data with realistic relationships | **A** | Demo batches/markets/facilities are internally consistent (e.g. `MARKET_BASE_PRICE_PER_KG` keyed to real market IDs, commodity-filtered market pools). |
| Replaceable data layer | **A** | See Section 3's architecture note — `demo/data` and `demo/scenarios` are the only places mock data lives; nothing is hard-coded inside components or the engine. |
| Business logic not hard-coded into visual components | **A** | Confirmed while reading every component: components format and render engine output, they don't compute it. |
| Calculations eventually sourced from the real decision engine | **A** | Already true today — the "mock" part is the *inputs* (telemetry, prices), not the *calculations*, which already run through the real `evaluateDecision()`. |
| Never implying production-grade prediction where it doesn't exist | **A** | `DemoBanner` ("Demo Mode... Synthetic telemetry · indicative market values"), `ProvenanceBadge` ("Synthetic"), `dataProvenance: "SYNTHETIC"` on every demo entity, `confidenceStatus: "SIMULATION-LIMITED"` — this is enforced pervasively, not just declared. |

This section is, alongside Section 4, where the existing implementation already matches the vision most exactly — worth calling out explicitly since it's easy to assume "mock data" work is a gap when here it's a genuine strength to preserve.

---

## 11. Animation and Interaction Philosophy

| Element | Category | Evidence |
|---|---|---|
| Motion for decision computation / value changes / list reordering | **A** | `RankingList` uses `motion.div layout` for reordering (`RankingList.tsx:17`); `RecommendationCard` animates value changes with `AnimatePresence` (`RecommendationCard.tsx:33-44, 183-196`); `EventTimeline` staggers entrance. |
| Non-decorative, functional animation | **A** | All existing motion ties to a real state change (a new winner, a new value, a reordered rank) — none of it is idle/ambient decoration. |
| Motion for batch movement / route selection / deterioration over time | **C** | No literal batch-journey or route animation exists anywhere. |
| "Responsive, deliberate, premium, calm, intelligent, operational" feel | **B** | Current interaction feels calm/operational already (consistent with the avoid-list in the Product Experience section); "premium/cinematic" ambition is not yet reached — same gap as the landing page. |

---

## 12. Visual Hierarchy

The vision's ordering (batch state → economic risk → options → recommendation → why → next step) is **B**: broadly present on `/batches/[id]` already, but **economic risk isn't yet a distinct, prominent first-class element on the batch page itself** — "potential value at risk" currently only exists as a fleet-level KPI on the dashboard (`KPIGrid`), not foregrounded per-batch the way the vision's ordering implies it should be (second, right after batch state).

## 13. Product Personality

Qualitative. **B** overall — the restraint half of this (not looking like a generic AI dashboard, avoiding agriculture-website or fintech-dashboard clichés) is already achieved by what's *absent* from the codebase (no gradients/glow/glass, confirmed by reading every component). The ambition half (cinematic, premium, command-center) is not yet reached. No code contradicts the vision here; it simply hasn't been built out yet.

## 14. Long-Term Product Direction

| Element | Category | Evidence |
|---|---|---|
| Multi-crop support | **A** (architecture) | The engine and type system are already commodity-agnostic — the demo roster spans Tomato/Banana/Mango/Onion/Leafy Greens today (`src/demo/data/batches.ts`) and the engine makes no tomato-specific assumptions. |
| Multi-crop support, real data | **D** | D0/D1's real pipeline is TN-tomato-only by explicit STAGE0 scope; extending to other commodities is new data work, not an engine limitation. |
| Real-time telemetry, live market intel, logistics/processor/storage integrations | **D** | None started; out of STAGE0's current scope entirely. |
| Historical outcome learning, recommendation performance tracking, intervention success rates, recovered-value/spoilage-reduction analytics | **F** | This entire bullet list is the direct product of `outcome_record` + `action_execution` data accumulating after D4 ships. The vision's own worked example — "Recommendation → Processing, Expected ₹31,260, Actual ₹30,840, Outcome: Successful" — is literally the `outcome_record` row shape already defined in the D1 schema (`realized_value_inr`, `actual_destination`, etc.), just with zero rows in it. |

## 15. Design Principle ("Show the intelligence, not just the interface")

**A.** This is already the codebase's operating principle in practice, not just aspiration — see Sections 3, 4, and 10. `DecisionTrace` alone answers five of the vision's own seven framing questions ("what happened / what alternatives / what does it recommend / why / how much value") on demand, without any new work.

## 16. Implementation Direction ("evolve, don't rebuild")

Not a UI feature to categorize — a constraint on how to act on the rest of this document. Confirmed feasible: `src/domain/engine` is genuinely framework-free (no DB/HTTP imports anywhere in it — verified by reading every file in `src/domain/engine/`), and the D1 database schema was designed around it rather than the other way around (`docs/data/schema-notes.md`'s "engine stays framework-free" principle). Nothing here needs a rebuild; the engine, types, and D1 schema are the foundation to build the vision's UI on top of, not around.

## 17. Core Experience Summary

Restates the whole narrative as one spine: **DATA → INTELLIGENCE → DECISION → EXPLANATION → ACTION → OUTCOME**. Breaking that spine down by what's real today:

- **DATA**: real for D0's TN tomato measurement (`data/validation/`), real-but-unloaded for the running app (D2 pending), synthetic for everything else (by design, disclosed).
- **INTELLIGENCE → DECISION → EXPLANATION**: real today, already matches the vision closely (Sections 3–4, 10, 15).
- **ACTION → OUTCOME**: not real yet, and structurally can't be until D4 — this is the one part of the spine that is **F**, not just unbuilt UI.

---

## Everything gated on D2/D3/D4 (recommendation_candidate / outcome_record), collected

Per the explicit ask — every element above marked **F**, in one place:

| Vision element | Blocked on | Why |
|---|---|---|
| "Value recovered" KPI (Section 5) | D4 (`outcome_record`) | No realized-value data exists to sum. |
| "Spoilage avoided" KPI (Section 5) | D4 (`outcome_record`) | Needs realized outcome vs. baseline comparison. |
| Historical market context (Sections 7, 9) | D2 (`market_price` load) | Table exists, 0 rows. |
| Real demand signals (Section 9) | D0 finding, not just D2 | Arrivals data confirmed absent at every source tried — may be a permanent constraint, not a queue position. |
| Accept/Execute/Override controls (Section 8) | D4 (`action_execution`) | STAGE0.md's D4 scope, verbatim: "Writes action_execution." |
| Outcome learning / performance tracking / success-rate analytics (Section 14) | D4 (`outcome_record`) | Zero rows, no writer, nothing to learn from yet. |
| "Actual recovery ₹30,840 / Outcome: Successful" worked example (Section 14) | D4 (`outcome_record`) | This is a literal `outcome_record` row; schema exists, table is empty. |
| Persisted, queryable candidate/decision history across time (implied by Sections 4, 6, 9's "decision intelligence") | D3 (`recommendation`, `recommendation_candidate`) | Candidates are correctly computed live today (framework-free engine, recomputed per render) — that's real and fine for a single current view, but there is no persisted history to audit or backtest against yet. `recommendation_candidate` exists specifically as "the future backtest/training set" per `docs/data/schema-notes.md` and currently has 0 rows. |
| "Expected arrival condition" as a genuinely batch-specific, computed figure (Section 8) | D3 (context builder reading real telemetry) | Currently a fixed indicative string in demo data, not computed per batch. |

Nothing above should be built to *look* real before D3/D4 land — per the vision's own Section 10, that would be presenting a number as authoritative when it isn't.
