# FreshRoute — Product Build Ledger

> **What this file is.** A session-by-session execution plan for building
> **FreshRoute** as a real, production-shaped product for Build with Bharat 2.0.
> The authoritative product spec is the **Appendix** at the bottom (Sections 0–52).
> This ledger tells you *what to build in what order, and when to stop*. When a
> session references a spec section, read that section in the Appendix before building.
>
> **Build the real product experience — real UX, real component architecture, real
> state management, real deterministic decision logic.** The only simulated parts are
> the real-world data feeds that are not yet connected (telemetry, market data,
> facility/route state). Everything the operator touches must be genuinely built and
> genuinely functional. This is not a mockup and must not be built like one.
>
> **Scope of this stage:** frontend + a real deterministic decision engine, running on
> controlled synthetic data. No production backend, database, live API, LLM, or auth is
> wired in *yet* — those follow the selection stage. Internal architecture must still be
> production-grade so that backend integration later is a connection, not a rewrite.

---

## STANDING RULES (apply to every session, no exceptions)

1. **Do not run git.** No `git add`, `commit`, `push`, `branch`, or any git command.
   The human commits manually after each gate passes. Your job ends at the gate.
2. **No AI co-author attribution** anywhere — not in code comments, not in the
   README, not in commit-message suggestions.
3. **One session at a time.** Build only the current session's scope. Do not read
   ahead and start the next session's work.
4. **Stop at the gate.** When the current session's Gate is met, STOP, report the
   deliverables listed for that session, and wait. Do not begin the next session.
5. **POSIX / Git Bash-compatible commands only** (Windows + VS Code environment).
   No PowerShell-only syntax.
6. **Keep the domain engine independent of React.** `domain/` never imports from
   `components/` or `app/`. UI depends on the engine, never the reverse.
7. **Minimal dependencies.** Only what a session genuinely needs. No speculative
   package installs.
8. **If a session's gate cannot be met, stop and report the blocker.** Do not
   paper over a failing gate to move on.

---

## GROUND RULES — DATA PROVENANCE & HONESTY (shown to judges; must hold every session)

These are **not** statements about build quality — the build is production-grade. They
are honest disclosures about which *data* is real vs. simulated, shown on-screen to
reviewers. Removing them would make the product dishonest. Keep them intact. Full detail
in Appendix Sections 2, 35, 36, 48.

- The product runs on **synthetic telemetry and indicative market values** at this stage.
- **Never imply** live AGMARKNET data, live IoT telemetry, live prices, a trained
  production model, calibrated confidence, or measured real-world impact.
- Confidence is always **`SIMULATION-LIMITED`** — never a calibrated percentage.
- Every dataset carries provenance: `dataProvenance: SYNTHETIC`.
- The **environment indicator** (`DEMO MODE` badge + "synthetic telemetry · indicative
  market values") stays visible in the primary decision experience. Treat it as an
  environment/provenance indicator, not an apology banner and not a statement that the
  product is a throwaway.
- Six pathways carry a first-class **evidence tier**:
  - **VERIFIED CORE:** SELL, DISCOUNT, DIVERT
  - **PLAUSIBLE–UNVERIFIED:** REROUTE, STORE, PROCESS
  - Plausible–unverified actions must be **visibly flagged** and must **never be
    presented as field-validated**. They still compete honestly in ranking.
- The recommendation **never implies automatic execution** — always
  "operator reviews and executes".
- **Nothing is hard-coded to win.** The recommendation is always computed by the
  engine from candidate economics. `if scenario => ACTION` is forbidden.

---

## SCOPE TIERS (where to cut if time runs short)

- **P0 — the core product experience. Must be flawless.** Sessions 0–5.
  Entry → operations dashboard → batch command view → six-pathway engine →
  recommendation → scenario workspace → decision trace → reset → safe states. This is
  the entire reviewer flow (Appendix Section 51). **If Sessions 0–5 are green, you have
  a shippable product and may deploy immediately.**
- **P1 — supporting context, not in the reviewer flow. Safe to skip.** Session 6.
  Markets page, Facilities page, SVG route map.
- **P2 — cut first under pressure.** Session 7 (except the final build + deploy,
  which you always do).

**Do not render sidebar nav items for pages that are not built.** Five real nav
items beat six with a dead link.

---

## TECH STACK (fixed — Appendix Section 41)

Next.js · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion ·
Recharts (only where a chart genuinely helps) · Lucide icons (if needed).

No auth · no database · no backend · no live APIs · no external API keys · no LLM.
Internal architecture must still be production-shaped (Appendix Sections 42, 43).

---

# SESSIONS

---

## SESSION 0 — Scaffold & Contracts

**Goal:** a compiling skeleton and the entire type/engine contract, with zero UI.
Everything downstream depends on these types being right, so they come first.

**Build:**
- Next.js + TypeScript + Tailwind + shadcn/ui + Framer Motion project.
- File structure per Appendix Section 43 (`app/`, `components/`, `domain/`,
  `demo/`, `lib/`), directories created even if empty.
- The full domain type layer (Appendix Sections 22, 31):
  - `EvidenceTier` (`VERIFIED` | `PLAUSIBLE_UNVERIFIED`), `FeasibilityStatus`,
    and all model interfaces: `Batch`, `Telemetry`, `Market`, `MarketSnapshot`,
    `Facility`, `CandidatePath`, `DecisionContext`, `DecisionResult`,
    `Recommendation`, `DecisionTrace`, `Scenario`, `RankedAction`.
  - Use enums / literal unions, never unrestricted strings.
- Engine module with **exported function signatures only**, returning typed stubs
  (e.g. `evaluateDecision(context: DecisionContext): DecisionResult`).
- Environment/provenance constant (`DEMO_MODE = true`) and provenance constant.

**Gate:**
- `npm run build` passes clean. No TypeScript errors.
- All shared types compile and are exported.
- Engine functions exist and are importable (stubs are fine).
- No UI beyond the default Next.js page.

**Report:** file tree created, list of types defined, engine signatures exported.
Then **STOP**.

---

## SESSION 1 — The Deterministic Decision Engine

**Goal:** the core of the product. Pure TypeScript, fully testable with no UI. If this
is wrong, every screen built on it is theater — so **do not rush this session.**

**Build (Appendix Sections 14, 20, 21, 23, 32, 33, 34):**
- All **six real evaluation functions** (SELL, DISCOUNT, DIVERT, REROUTE, STORE,
  PROCESS). Each responds to every relevant scenario input. No static formulas
  for REROUTE/STORE/PROCESS.
- Feasibility as a **hard filter** before ranking (Section 14). Infeasible paths
  carry a reason and are excluded from the active score.
- **Path-aware remaining useful life** (Section 34): RUL computed per candidate
  through hold → transit → market dwell. Do not reuse one immutable batch RUL.
  *(Highest-risk logic in the build — budget debugging time here.)*
- Economic model (Section 33): `expectedRecovery = saleableKg × realizablePrice
  − transport − handling − storage − processing − riskAdjustment`. Baseline
  included. `modelledUplift = recommendedValue − baselineValue`.
- Ranking → narrow-margin policy (Section 23) → recommendation assembly.
- Three curated scenarios (Section 20) tuned **in the input data**, not by
  hard-coding winners:
  - Scenario 01 "Stable shipment" → **SELL**
  - Scenario 02 "Thermal exposure" → **DIVERT**
  - Scenario 03 "Market shift" → **REROUTE**
- Each curated winner must beat runner-up by **≥ ~8–10%** (Section 21). Tune
  inputs until the deterministic engine naturally produces this.

**Gate:**
- A throwaway Node/TS test script (not shipped UI) runs all three curated
  scenarios and prints the ranked candidates with values.
- Each scenario produces the intended winner **from computation**, with the
  margin ≥ ~8–10% over runner-up.
- Extreme case (degraded + max thermal + max delay) returns a clean
  "no feasible pathway" result object — no `NaN`, no undefined winner.
- Same input always yields same output (determinism verified by running twice).

**Report:** the six evaluation functions, the curated-scenario outputs with actual
margins, feasibility-filter behaviour, no-feasible-path result shape. Then **STOP**.

---

## SESSION 2 — App Shell & Entry Screen

**Goal:** the operational product frame and the entry route. P0 nav only.

**Build (Appendix Sections 5, 6, 7, 8, 45, 46):**
- `AppShell`, `Sidebar`, `TopBar`, `DemoBanner` (environment indicator),
  `ProvenanceBadge`, `StatusPill`.
- Sidebar shows **only P0 items** for now: Overview, Batches, Decisions.
  (Markets / Facilities / Activity are added in Session 6 when built.)
- Dark operations visual identity: near-black bg, charcoal surfaces, warm orange
  accent, restrained green, neutral grays, white type, 1px borders. **No purple,
  no glassmorphism, no particle/aurora effects.**
- Root `/` entry screen (product intro, not marketing): FreshRoute /
  "Value Recovery Decision Layer" / environment indicator / synthetic-data note /
  `ENTER OPERATIONS` → routes to `/dashboard` placeholder.

**Gate:**
- Shell renders on desktop; environment indicator visible.
- `ENTER OPERATIONS` navigates to a `/dashboard` placeholder.
- No dead nav links (only built routes are shown).
- `npm run build` passes.

**Report:** components built, routes wired, nav items shown. Then **STOP**.

---

## SESSION 3 — Operations Dashboard & Batch List

**Goal:** the operations overview and the click-through into a batch.

**Build (Appendix Section 9):**
- `KPIGrid` (Active batches, At-risk, Potential value at risk, Recommendations
  today).
- `BatchTable` / high-density batch cards with the columns in Section 9 and
  visual states (Normal / At risk / Decision required / Assumption flagged).
- `/dashboard` route assembled from the synthetic batch dataset.
- Clicking a batch routes to `/batches/[id]` (placeholder view for now).

**Gate:**
- Dashboard renders batches with KPIs.
- Clicking a batch opens its `/batches/[id]` route.
- Environment indicator clearly shown.
- `npm run build` passes.

**Report:** dashboard components, synthetic batch dataset, click-through behaviour.
Then **STOP**.

---

## SESSION 4 — Batch Command View (Centerpiece)

**Goal:** the most important screen — a batch's full decision state, wired to the
Session 1 engine. **No hardcoded winner anywhere.**

**Build (Appendix Sections 10, 11, 12, 13, 16):**
- `BatchHeader`, `ConditionPanel` (temp, humidity, thermal exposure, condition,
  RUL, sparkline/deltas), `MarketPanel` (reachable markets, `INDICATIVE DEMO
  VALUE` badge), `LogisticsPanel`.
- `DecisionEngine` panel ("VALUE RECOVERY ENGINE" / "Comparing feasible pathways
  on one economic scale") rendering all six `PathwayCard`s + `RankingList`,
  each showing action, evidence tier, feasibility, expected recovery, cost,
  risk, rank.
- `RecommendationCard` (Section 16): action, expected recoverable value, modelled
  uplift, baseline, evidence, `SIMULATION-LIMITED` confidence, "valid for next
  decision window", 3 computed reasons, assumption flags, `VIEW DECISION TRACE`.
  Must state operator reviews and executes — never auto-execution.
- `EvidenceBadge`, `AssumptionFlag` as first-class components.
- All values sourced from `evaluateDecision()` — the card reflects engine output.

**Gate:**
- Batch command view renders recommendation and all six ranked pathways from the
  **engine**, not hardcoded data.
- Evidence tiers and assumption flags display correctly (verified vs unverified).
- Recommendation card shows uplift, baseline, `SIMULATION-LIMITED`.
- `npm run build` passes.

**Report:** batch-view components, how they bind to the engine, recommendation
card fields. Then **STOP**.

---

## SESSION 5 — Interaction: Scenario Workspace, Trace, Timeline, Safe States

**Goal:** make it *move*. This session's gate is the entire reviewer flow
(Appendix Section 51). **If it passes, you have a shippable product.**

**Build (Appendix Sections 15, 17, 18, 19, 23, 24, 25, 26):**
- `ScenarioDrawer`: thermal exposure, transit delay, market strength, batch
  condition controls + the three curated presets (Section 20). Every change flows
  through the single scenario state → engine → UI.
- `DecisionTrace` (Section 17): input snapshot, feasibility pass/fail, value
  calculation, ranking with deltas, explanation, provenance, engine version.
- `EventTimeline` (Section 26) with clickable events.
- **Default initial state = Scenario 01** (Section 25) on first load.
- **No-feasible-pathway** safe state (Section 15) — designed product state, not
  an error.
- **Narrow-margin** handling (Section 23).
- `RESET TO STABLE SCENARIO` (Section 24) returns full state to Scenario 01.
- Framer Motion for ranking reorder, value changes, recommendation transition
  (Section 37) — restrained, no spectacle.

**Gate (this is Section 51, run it exactly):**
- Change thermal exposure → RUL falls → candidate values recalc → ranking
  reorders → recommendation changes → reasons update → trace explains why.
- The three presets each produce their intended winner with a visible margin.
- Over-click extremes → `NO FEASIBLE PATHWAY`, no crash, no NaN.
- Narrow-margin case shows the narrow-margin state.
- Reset returns to Scenario 01.
- Full reviewer journey in Section 51 works end to end.
- `npm run build` passes; no console/hydration errors.

**Report:** scenario workspace, trace, timeline, safe states, reset, and a
walk-through confirming the Section 51 flow. Then **STOP**.
**(P0 complete. You may deploy now if time is short.)**

---

## SESSION 6 — P1 Supporting Context (skippable)

**Goal:** supporting context pages. None are in the reviewer flow — build only if
Sessions 0–5 are green and time remains.

**Build (Appendix Sections 12, 27, 28, 29):**
- `/markets` (Section 28) with `INDICATIVE DEMO VALUE` badges.
- `/facilities` (Section 29) with evidence tiers.
- SVG/canvas route map (Section 27) — **local only, no map API keys**. Supporting
  context; recommendation card stays primary.
- Add Markets / Facilities nav items now that the pages exist.

**Gate:**
- New routes render with synthetic data, clearly marked, no dead links.
- Map uses no external credentials.
- `npm run build` passes.

**Report:** pages added, map approach. Then **STOP**.

---

## SESSION 7 — P2, README & Ship

**Goal:** finish remaining low-priority surface, then verify and prepare deploy.
Under pressure, skip the P2 pages but always do the build + README + deploy prep.

**Build (Appendix Sections 24-README, 30, 50, 52):**
- `/activity` feed (Section 30) — P2, cut first if needed. Add its nav item only
  if built.
- `/decisions/[id]` — optional; the decision trace already lives as a panel in
  the batch view, so this route is not required. Build only if time allows.
- README (Appendix "24. README" / Section 52): purpose, current data scope
  (synthetic telemetry + indicative values), run/build/deploy instructions, and an
  explicit note that live-data, field validation and production integration follow
  the selection stage. **No AI co-author attribution.**
- Final verification pass (Appendix Section 50): every route, every scenario
  control, all safe states, responsive check (1440/1600/1920 + mobile stack per
  Section 38), accessibility pass (Section 39).

**Gate:**
- `npm run build` succeeds with no errors.
- Every visible route works; no dead buttons; no overflow; no layout shift.
- Vercel-ready.

**Report:** final architecture, routes, components, engine + six evaluation
functions, scenario presets with actual winning margins, safe-fallback + narrow-
margin + reset behaviour, evidence/provenance handling, validation performed,
build status, deployment instructions, known limitations. Then **STOP**.
**Do not start backend or production data integration in this stage.**

---

## POST-BUILD (human, not the agent)

- Deploy frontend to Vercel; capture the live URL.
- Put that URL on the pptx cover / references slide as the project link.
- Rehearse the Section 51 flow on the live link before judging — not on slides.

---
---

# APPENDIX — AUTHORITATIVE PRODUCT SPEC (Sections 0–52)

> The sessions above are the plan. Everything below is the reference. When a
> session cites a section number, read it here before building. Do not treat the
> Appendix as a to-do order — follow the session order, which is dependency-sorted.

<!-- =============================================================
     PASTE THE FULL 52-SECTION FRESHROUTE SPEC BELOW THIS LINE.
     (Your "PRODUCTION-GRADE DEMO BUILD" document, Sections 0–52,
     verbatim and unaltered. It is the source of truth for every
     section reference in the sessions above.)
     ============================================================= -->

<!-- BEGIN SPEC -->

# FRESHROUTE — PRODUCTION-GRADE DEMO BUILD
# BUILD THE REAL PRODUCT EXPERIENCE IN DEMO MODE
# BUILD WITH BHARAT 2.0 — COMPETITION REVIEW VERSION
# FRONTEND + DETERMINISTIC DEMO DECISION ENGINE
# NO PRODUCTION BACKEND YET

You are building the competition-facing FreshRoute product prototype.

This is the most important review artifact in the current stage.

The goal is NOT to build a lightweight mockup.

The goal is to build the FRONTEND EXPERIENCE, INFORMATION ARCHITECTURE,
DECISION EXPERIENCE, interaction model, component system and product
behaviour as if this were the real deployed FreshRoute product.

The only simulated parts are the unavailable real-world data/integrations.

The product must feel deployable today.

A mentor should be able to open the URL and think:

"This is the actual FreshRoute operational product running in DEMO MODE."

Do NOT build a static presentation website.

Do NOT build a generic SaaS dashboard.

Build the actual product experience.

============================================================
0. ABSOLUTE PRODUCT RULE
============================================================

BUILD THE REAL PRODUCT EXPERIENCE.

SIMULATE ONLY:
- telemetry
- market data
- facility/channel data where necessary
- route state
- recommendation inputs
- scenario outcomes

DO NOT SIMULATE THE PRODUCT EXPERIENCE ITSELF.

The demo must contain:

REAL UX
REAL COMPONENT ARCHITECTURE
REAL STATE MANAGEMENT
REAL INTERACTION
REAL DETERMINISTIC DECISION LOGIC
SIMULATED DATA

============================================================
1. PRODUCT DEFINITION
============================================================

PRODUCT:
FreshRoute

POSITIONING:
AI-Powered Perishable Value Recovery Engine

CORE:
Value Recovery Decision Layer

FreshRoute evaluates multiple feasible recovery pathways for a
perishable batch and determines which action is expected to preserve
the greatest recoverable value while accounting for:

- condition
- remaining useful life
- market conditions
- demand / arrivals
- logistics
- transport cost
- storage
- processing
- risk
- feasibility

Six recovery pathways:

SELL
DISCOUNT
DIVERT
REROUTE
STORE
PROCESS

Evidence state from the completed FreshRoute Phase 0 research:

VERIFIED CORE
SELL
DISCOUNT
DIVERT

PLAUSIBLE–UNVERIFIED
REROUTE
STORE
PROCESS

These statuses MUST exist in the product as first-class data.

============================================================
2. PRODUCT PRINCIPLE
============================================================

FreshRoute is NOT:

another cold-chain dashboard
another mandi price dashboard
another route optimizer
another shelf-life predictor
another sensor alerting system

FreshRoute is the layer that answers:

"Given this batch's current condition and today's market,
which recovery pathway preserves the most value?"

This must be the central UX idea.

============================================================
3. EXPERIENCE GOAL
============================================================

A mentor should understand the product within 30 seconds.

Within 60 seconds they should be able to:

1. See a real batch
2. Understand its current state
3. See what is changing
4. See all candidate recovery pathways
5. See their economics
6. Change the scenario
7. Watch the ranking change
8. See a new recommendation
9. Understand why
10. See which assumptions are verified vs unverified

The interface must communicate intelligence without requiring
a verbal explanation.

============================================================
4. PRODUCT INFORMATION ARCHITECTURE
============================================================

Build the application as a real product shell.

Primary route:

/

Secondary routes:

/dashboard
/batches
/batches/[id]
/decisions/[id]
/markets
/facilities
/activity

You may keep these routes lightweight but structurally real.

The PRIMARY REVIEW EXPERIENCE is:

/dashboard
→ select batch
→ /batches/[id]
→ open decision view
→ interact with live scenario
→ recommendation changes

Do NOT create pages that exist only for visual filler.

Every visible navigation item must have a meaningful product purpose.

============================================================
5. APPLICATION SHELL
============================================================

Build a premium operational application shell.

DESKTOP:

Left sidebar:
- Overview
- Batches
- Decisions
- Markets
- Facilities
- Activity

Bottom sidebar:
- Demo Mode
- Environment indicator
- Product version

Top bar:
- FreshRoute
- current workspace / hub
- global search
- notifications
- user/operator profile

Main content:
responsive operational workspace

The shell must feel like:

high-end logistics operations software
+
financial decision terminal
+
industrial control interface

NOT:
- generic admin dashboard
- CRM
- crypto app
- startup landing page

============================================================
6. VISUAL IDENTITY
============================================================

Visual direction:

DARK OPERATIONS INTERFACE

Use:
- near-black background
- charcoal surfaces
- warm FreshRoute orange
- restrained green for positive/recovery/verified states
- neutral grays
- white typography
- fine 1px borders
- subtle elevation
- high information density
- strong numerical hierarchy

DO NOT USE:
- purple
- rainbow gradients
- glowing cyberpunk UI
- excessive glassmorphism
- decorative aurora
- particle backgrounds
- random blobs
- visual noise
- excessive rounded cards

The product should feel engineered.

============================================================
7. TYPOGRAPHY
============================================================

Use a highly legible professional sans-serif.

Prioritize:
- numerical readability
- compact data labels
- strong hierarchy
- short operational copy

Use monospace selectively for:
- batch IDs
- timestamps
- model / engine versions
- system status
- provenance identifiers

Do not overuse monospace.

============================================================
8. HOME / LANDING ENTRY
============================================================

The root route / is NOT a marketing landing page.

It is the product entry screen.

Hero:

FreshRoute
Value Recovery Decision Layer

"One batch. Multiple recovery paths. One value-based recommendation."

Visible:

[ ENTER OPERATIONS ]

Supporting indicator:

DEMO MODE
Synthetic telemetry · indicative market values

Below:
small explanation of:

Condition
Market
Logistics
Economics
→
Decision

Click ENTER OPERATIONS:
go to /dashboard

============================================================
9. DASHBOARD
============================================================

Build a realistic operations dashboard.

Header:

OPERATIONS CENTER

Subheader:

"FreshRoute decision state across active perishable batches"

Top KPIs:

Active batches
At-risk batches
Potential value at risk
Recommendations issued today

These are demo values.

Clearly mark demo environment.

Main section:

ACTIVE BATCHES

Table / high-density cards:

Batch ID
Commodity
Origin
Destination
Quantity
Condition
Remaining useful life
Current plan
FreshRoute recommendation
Expected recoverable value
Status

Visual states:

Normal
At risk
Decision required
Assumption flagged

Clicking a batch opens the real batch decision view.

============================================================
10. BATCH DETAIL VIEW
============================================================

Route:

/batches/[id]

This is the most important screen.

Create a premium "batch command view".

Header:

FR-2048
Tomato
2,000 kg

Status:
DECISION REQUIRED

Current location:
Tamil Nadu hub

Current plan:
Sell to planned market

Top metric row:

QUALITY
Remaining useful life
Current condition

MARKET
Current market price
Alternative market signal

LOGISTICS
ETA
Delay
Exposure

ECONOMICS
Current expected recovery
Potential recovery range

============================================================
11. LIVE CONDITION PANEL
============================================================

Show:

Temperature
Humidity
Thermal exposure
Condition state
Remaining useful life

Use:
- sparkline
- timeline
- metric deltas

Create a clear state transition:

10:00
Condition stable

10:15
Thermal exposure detected

10:17
Remaining useful life revised

10:18
FreshRoute reevaluated

Changes should animate naturally.

============================================================
12. MARKET INTELLIGENCE PANEL
============================================================

Show reachable market options.

Example:

Market
Price/kg
Demand signal
ETA
Transit cost
Expected arrival condition
Potential recovery

Use a compact comparison table.

Do NOT call these live prices.

Badge:

INDICATIVE DEMO VALUE

============================================================
13. DECISION ENGINE PANEL
============================================================

This is the centerpiece.

Title:

VALUE RECOVERY ENGINE

Subline:

"Comparing feasible pathways on one economic scale"

Display all six pathways.

For every pathway show:

ACTION
Evidence status
Feasibility
Expected recovery
Cost
Risk
Rank

Example:

01 DIVERT
VERIFIED CORE
Feasible
₹20,100
₹2,300 cost
Lower exposure
#1

02 REROUTE
PLAUSIBLE–UNVERIFIED
Feasible*
₹19,400
₹2,100 cost
...
#2

etc.

Use visual rank movement when scenario changes.

============================================================
14. FEASIBILITY IS A HARD FILTER
============================================================

Do NOT treat feasibility as just another score.

Pipeline:

RAW INPUTS
↓
FEASIBILITY FILTER
↓
CANDIDATE PATHWAYS
↓
VALUE CALCULATION
↓
RISK ADJUSTMENT
↓
RANKING

If an action is infeasible:

show:

INFEASIBLE

Reason:
"Storage capacity unavailable"

or:

"Execution rights require field validation"

Do not include infeasible actions in the active ranking score.

============================================================
15. NO-FEASIBLE-ACTION SAFETY STATE
============================================================

Handle the edge case where every pathway fails feasibility.

Do NOT allow:
- blank recommendation cards
- undefined winner
- NaN values
- broken ranking
- crashed UI

Instead show:

NO FEASIBLE PATHWAY

"Current conditions do not satisfy the feasibility constraints for
any available recovery pathway."

Then provide:

NEXT STEP
"Hold and reassess at the next decision window."

Show:
- current condition
- remaining useful life
- last known market state
- next reassessment time

This is an intentional product state, not an error state.

============================================================
16. RECOMMENDATION EXPERIENCE
============================================================

The recommendation card must be the most important component.

Example:

------------------------------------------------
FRESHROUTE RECOMMENDATION
------------------------------------------------

DIVERT

Expected recoverable value
₹20,100

Modelled uplift vs current plan
+₹6,300

Baseline
₹13,800

Evidence
VERIFIED CORE

Confidence
SIMULATION-LIMITED

VALID FOR
Next decision window

WHY

• Remaining useful life has fallen to 31h
• Planned market recovery has weakened
• Alternate channel yields higher expected recovery

ASSUMPTION FLAGS

None

[ VIEW DECISION TRACE ]

------------------------------------------------

The card must never imply automatic execution.

Use:

"Operator reviews and executes"

============================================================
17. DECISION TRACE
============================================================

When opened, show:

INPUT SNAPSHOT
- condition
- remaining life
- market state
- logistics
- costs

FEASIBILITY
- which paths passed
- which failed
- why

VALUE CALCULATION
- baseline
- candidate recovery
- cost
- risk

RANKING
- all candidates
- scores
- deltas

EXPLANATION
- why winner beat alternatives

PROVENANCE
- synthetic telemetry
- indicative market values

ENGINE
- Demo engine version
- scenario version

This should look like an auditable enterprise system.

============================================================
18. ASSUMPTION FLAGS
============================================================

Every plausible-unverified recommendation must expose:

ASSUMPTION FLAG

Example:

"REROUTE assumes the operator can redirect the consignment mid-transit.
Execution rights are not yet field-verified."

This must be machine-readable in the UI.

Do not hide uncertainty.

============================================================
19. SCENARIO SIMULATOR
============================================================

The scenario simulator must feel like a real operational decision
workspace, not a toy slider collection.

Create a drawer / right-side scenario workspace:

SCENARIO CONTROL

Temperature exposure
0h → +6h

Transit delay
0h → +6h

Destination market strength
Weak → Strong

Batch condition
Healthy → Moderate → Degraded

Every change must update:

- remaining useful life
- market viability
- action feasibility
- candidate values
- ranking
- recommendation
- explanation
- assumptions

Everything must come from the same scenario state.

============================================================
20. CURATED SCENARIOS
============================================================

Provide three professional presets.

SCENARIO 01
"Stable shipment"

Expected winner:
SELL

SCENARIO 02
"Thermal exposure"

Expected winner:
DIVERT

SCENARIO 03
"Market shift"

Expected winner:
REROUTE if its validation assumption is enabled.

IMPORTANT:

The recommendation must NOT be hard-coded.

All six action functions must respond to the scenario inputs.

Changing:
- thermal exposure
- transit delay
- market strength
- batch condition

must be capable of changing the economics of ALL six pathways where
that input is relevant.

Do not create static formulas for REROUTE / STORE / PROCESS.

Tune the DEMO INPUT DATA and cost assumptions until the deterministic
engine naturally produces the intended scenario winners.

Do not hard-code:

if scenarioB => DIVERT

or equivalent winner-selection logic.

============================================================
21. CURATED-SCENARIO MARGIN REQUIREMENT
============================================================

For each curated scenario, the winning action must beat the runner-up
by a clearly visible margin.

Target:

minimum ~8–10% relative advantage over the runner-up.

The purpose is not mathematical realism claims; it is visual clarity
during live judging.

Do not create a ₹20,100 vs ₹20,050 result and call it a strong decision.

Tune the DEMO scenario inputs so the intended winner has a visually
obvious economic advantage while remaining internally coherent.

Show the actual margin in the UI if useful:

"Decision margin: +9.6% vs next best pathway"

Do not fabricate the recommendation.

The engine must still compute it from candidate economics.

============================================================
22. RANKED ACTION TYPE
============================================================

Define a strongly typed ranked action object.

At minimum:

RankedAction {
  action
  expectedRecovery
  cost
  riskLevel
  evidenceTier
  feasible
  feasibilityReason
  score
  rank
  reason?
}

The main DecisionResult must contain:

recommendedAction
baselineValue
recommendedValue
modelledUplift
rankedCandidates
feasibilityResults
reasons
assumptionFlags
confidenceStatus
engineVersion
dataProvenance

Keep these shared types between the engine and UI.

============================================================
23. TIE / NARROW-MARGIN HANDLING
============================================================

Do not present a false sense of certainty when two actions are almost
identical.

If:

absolute difference between winner and runner-up
is below a configured narrow-margin threshold

show:

"NARROW DECISION MARGIN"

and explain:

"Top pathways are economically close; operator review recommended."

Do not invent a precise confidence percentage.

============================================================
24. RESET / SAFE DEMO CONTROL
============================================================

Provide:

[ RESET TO STABLE SCENARIO ]

This returns the complete demo state to Scenario 01.

Reset:

- condition
- thermal exposure
- delay
- market state
- ranking
- recommendation
- timeline
- decision trace

The reset control should be accessible from the scenario workspace.

============================================================
25. DEFAULT INITIAL STATE
============================================================

The very first page load MUST be Scenario 01:

"Stable shipment"

Expected winner:
SELL

The judge should see a coherent baseline immediately.

Do not start in an undefined or degraded state.

============================================================
26. EVENT TIMELINE
============================================================

Show:

06:00
Shipment dispatched

09:40
Thermal exposure detected

10:15
Condition updated

10:16
Market refreshed

10:17
FreshRoute recalculates candidate pathways

10:18
Recommendation issued

Make it visually elegant.

Allow clicking an event to inspect its effect on the decision.

============================================================
27. MAP / LOGISTICS VIEW
============================================================

Include a lightweight operational map.

Show:

Origin
Current position
Planned destination
Alternate destination
Potential store
Potential processor
Alternate buyer/channel

The map is supporting context.

The recommendation card remains the primary product.

Use a production-style dark map.

If an external map provider would require API keys or complicate
deployment, use a local SVG/canvas route visualization.

No dependency on commercial map credentials.

============================================================
28. MARKETS PAGE
============================================================

Create a realistic market intelligence view.

Columns:

Market
Commodity
Indicative price
Arrival signal
Distance
ETA
Decision relevance

Highlight the market currently influencing the recommendation.

Clearly badge the values:

INDICATIVE DEMO VALUE

============================================================
29. FACILITIES PAGE
============================================================

Show:

Cold stores
Processing facilities
Secondary buyers / channels

Each item:

Facility name
Type
Capacity status
Current decision relevance
Evidence tier

Use:

VERIFIED
or
PLAUSIBLE–UNVERIFIED

Do not invent real-world facilities beyond the demo dataset.

Clearly mark demo data.

============================================================
30. ACTIVITY PAGE
============================================================

Show recommendation events:

10:18
FR-2048
DIVERT
₹20,100
Verified core

10:19
Operator review pending

Include:
recommendation
status
value
evidence tier

============================================================
31. DEMO DATA MODEL
============================================================

Create strongly typed TypeScript interfaces:

Batch
Telemetry
Market
MarketSnapshot
Facility
CandidatePath
DecisionContext
DecisionResult
Recommendation
DecisionTrace
Scenario
EvidenceTier
FeasibilityStatus

EvidenceTier:

VERIFIED
PLAUSIBLE_UNVERIFIED

Use enums / literal unions instead of unrestricted strings.

============================================================
32. DECISION ENGINE
============================================================

The engine must be pure and deterministic.

No LLM.
No external AI API.
No backend dependency.
No hidden winner constants.

Suggested:

evaluateDecision(context)

Returns:

DecisionResult

The recommendation must be calculated.

Do NOT write:

if degraded => DIVERT

Instead:

1. generate all candidate pathways
2. evaluate feasibility
3. calculate economic outcome
4. calculate risk adjustment
5. rank feasible candidates
6. apply narrow-margin policy
7. produce recommendation

All six action functions must be real evaluation functions.

============================================================
33. ECONOMIC MODEL
============================================================

Keep the demo model simplified but internally coherent.

Expected recoverable value:

saleableQuantityKg
× realizablePricePerKg
− transportCost
− handlingCost
− storageCost
− processingCost
− riskAdjustment

All candidate pathways must use comparable accounting.

Baseline must be included.

Modelled uplift:

recommendedValue − baselineValue

Label:

MODELLED UPLIFT

Never:

"actual revenue"
"money saved"
"measured impact"

============================================================
34. PATH-AWARE CONDITION MODEL
============================================================

The demo should conceptually model remaining useful life as path-aware.

For each candidate:

hold
→ transit
→ market dwell
→ resulting useful life

Do not store one immutable batch RUL and reuse it blindly.

The demo model may be simplified, but architecture must reflect
path-dependent deterioration.

============================================================
35. CONFIDENCE
============================================================

Do not present a calibrated numeric confidence.

Use:

SIMULATION-LIMITED

Explanation:

"Confidence is not calibrated against real-world outcome data in this
prototype."

============================================================
36. DATA PROVENANCE
============================================================

Every demo dataset should carry:

dataProvenance:
SYNTHETIC

sourceType:
DEMO_SCENARIO

containsSimulatedData:
true

Show:

DEMO MODE
Synthetic telemetry · indicative market values

This must remain visible in the primary decision experience.

============================================================
37. MOTION DESIGN
============================================================

Use Framer Motion.

Motion should communicate system state:

- batch state changes
- ranking reordering
- value changes
- recommendation transition
- timeline progression
- feasibility changes
- scenario drawer
- decision trace

Use short, precise transitions.

No decorative animation.

No scroll spectacle.

No 3D truck inside the operational product.

============================================================
38. RESPONSIVE UX
============================================================

Desktop first.

Support:
1440
1600
1920

Tablet:
preserve hierarchy.

Mobile:

Recommendation
↓
Batch state
↓
Scenario
↓
Pathways
↓
Decision trace

No horizontal overflow.

============================================================
39. ACCESSIBILITY
============================================================

Support:

keyboard navigation
focus states
ARIA labels
semantic structure
reduced motion
contrast
readable tables

============================================================
40. PERFORMANCE
============================================================

The app must feel fast.

Avoid:
- huge dependencies
- unnecessary network calls
- heavy 3D
- unnecessary charts
- giant assets

Target:

fast first render
smooth interaction
no layout shift

============================================================
41. TECH STACK
============================================================

Use:

Next.js
TypeScript
Tailwind CSS
shadcn/ui
Framer Motion

Use Recharts only where a chart genuinely improves comprehension.

Use Lucide icons if needed.

No authentication.
No database.
No production backend.
No live APIs.
No external API keys.
No LLM API.

Internal architecture must still be production-shaped.

============================================================
42. COMPONENT ARCHITECTURE
============================================================

Build reusable components:

AppShell
Sidebar
TopBar
DemoBanner
KPIGrid
BatchTable
BatchHeader
ConditionPanel
MarketPanel
LogisticsPanel
DecisionEngine
PathwayCard
RankingList
RecommendationCard
DecisionTrace
ScenarioDrawer
EventTimeline
EvidenceBadge
AssumptionFlag
ProvenanceBadge
MarketTable
FacilityTable
ActivityFeed
StatusPill

Do not write one giant component.

Separate:
UI
domain logic
demo data
state
types

============================================================
43. FILE STRUCTURE
============================================================

Use a clean structure similar to:

src/
  app/
    page.tsx
    dashboard/
    batches/
    decisions/
    markets/
    facilities/
    activity/
  components/
    shell/
    batch/
    decision/
    market/
    facility/
    shared/
  domain/
    engine/
    models/
    types/
  demo/
    data/
    scenarios/
  lib/
    calculations/
    formatting/

Keep the domain engine independent from React UI.

============================================================
44. QUALITY OF UX COPY
============================================================

Use precise operator language.

Avoid:
"Unlock your workflow"
"Next-gen AI"
"Supercharge"
"Revolutionize"

Prefer:

"Decision required"
"Remaining useful life"
"Expected recoverable value"
"Modelled uplift"
"Feasible"
"Validation assumption"
"Operator review"

============================================================
45. DEMO ENTRY EXPERIENCE
============================================================

At the top:

FRESHROUTE
VALUE RECOVERY DECISION LAYER

[ DEMO MODE ]

Synthetic telemetry · indicative market values

Do not use an intrusive warning banner.

It should feel like an environment indicator,
not an apology.

============================================================
46. LANDING / PRODUCT INTRO
============================================================

On /:

Large:

FreshRoute

"Every hour changes the value of fresh produce."

Then:

"FreshRoute evaluates the recovery paths available to a batch
and recommends the one expected to preserve the most value."

Show:

Condition
Market
Logistics
Cost
↓
FreshRoute
↓
Best recovery path

CTA:

[ OPEN OPERATIONS ]

Below:

DEMO ENVIRONMENT
Synthetic telemetry · indicative market values

============================================================
47. PRODUCT, NOT MOCKUP STANDARD
============================================================

Before completion ask:

Would a logistics operator recognize this as an operational tool?

Would a mentor understand the product without seeing the PPT?

Does the recommendation feel actionable?

Can the judge manipulate the situation and see the answer change?

Can they inspect why?

Can they see assumptions?

Can they see the economic trade-off?

Can they see the alternatives the engine rejected?

Can they safely over-click the controls without breaking the state?

If any answer is no, improve the product before finishing.

============================================================
48. WHAT MUST NOT BE FAKE
============================================================

Do not fake:

- live system status
- real user data
- calibrated confidence
- real IoT connectivity
- real market data
- real API calls
- real outcome learning
- real-world impact results

Everything simulated must be explicitly represented as such.

============================================================
49. WHAT SHOULD FEEL REAL
============================================================

The following MUST feel production-grade:

- navigation
- batch management
- decision workflow
- candidate comparison
- recommendation card
- decision trace
- market context
- event timeline
- scenario control
- evidence states
- assumptions
- operator review
- data provenance
- responsive behaviour
- visual hierarchy
- state transitions
- empty/error/safe states

============================================================
50. BUILD VERIFICATION
============================================================

Before stopping:

Run:

npm run build

Then inspect for:

- TypeScript errors
- console errors
- hydration errors
- broken navigation
- broken scenario updates
- broken ranking
- incorrect calculations
- overflow
- layout shift
- inaccessible controls
- dead buttons

Manually test every route.

Manually test:

SCENARIO 01
Stable shipment

SCENARIO 02
Thermal exposure

SCENARIO 03
Market shift

Then manually test:

temperature exposure
transit delay
market condition
batch condition

Verify that:

remaining useful life changes
candidate values change
ranking changes
recommendation changes
reasons change
assumption flags change where appropriate

Test the extreme case:

Degraded
+
maximum thermal exposure
+
maximum transit delay

Verify the product gracefully enters:

NO FEASIBLE PATHWAY

if no candidate satisfies feasibility.

Verify reset returns the system to Scenario 01.

Verify narrow-margin handling works when two candidates are within the
configured threshold.

============================================================
51. FINAL JUDGE FLOW
============================================================

Ideal reviewer journey:

OPEN LINK
↓
FreshRoute operational intro
↓
OPEN OPERATIONS
↓
See active batch
↓
Open FR-2048
↓
See current recommendation
↓
Open scenario controls
↓
Increase thermal exposure
↓
Watch RUL fall
↓
Watch candidate economics change
↓
Watch ranking reorder
↓
Watch recommendation change
↓
Open decision trace
↓
See WHY
↓
See assumption/evidence status
↓
Understand FreshRoute

This is the demo.

Not a marketing site.

Not a static dashboard.

A real product experience running on controlled demo data.

============================================================
52. FINAL DELIVERABLE
============================================================

Create:

1. Production-quality frontend demo
2. Deterministic decision engine
3. Fully interactive scenario simulator
4. Real product shell and navigation
5. Responsive operational views
6. Decision trace
7. Evidence/provenance system
8. Demo-mode environment indicator
9. Safe fallback / no-feasible-path state
10. Narrow-margin handling
11. Reset-to-default scenario
12. README
13. Successful production build

Deploy-ready for Vercel.

When complete, report:

- architecture
- routes
- components
- decision engine
- candidate evaluation functions
- scenario presets
- winning margins for each curated scenario
- safe fallback behaviour
- tie/narrow-margin behaviour
- reset behaviour
- evidence/provenance handling
- validation performed
- build status
- deployment instructions
- known limitations

Then STOP.

DO NOT start the real FreshRoute backend or production data integration.

<!-- END SPEC -->