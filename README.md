# FreshRoute

**AI-Powered Perishable Value Recovery Engine**
Value Recovery Decision Layer · Build with Bharat 2.0

FreshRoute evaluates the recovery pathways available to a perishable batch — sell,
discount, divert, reroute, store, process — and recommends the one expected to
preserve the most value, given the batch's current condition, market signals,
logistics, and cost. It is not a spoilage predictor, a route optimiser, or a price
dashboard on its own; it is the layer that turns those signals into one ranked,
economically-priced decision.

**Live product:** https://d-freshroute.vercel.app
**Deck / research context:** available on request

---

## Why this exists

Post-harvest loss in India is largest not because produce spoils unpredictably, but
because the plan committed at dispatch never gets re-evaluated once conditions
change in transit. FreshRoute is built to answer one question, continuously, for a
single batch:

> Given this batch's current condition and today's market, which recovery pathway
> preserves the most value?

## Evidence tiers

Not all six pathways carry the same weight of evidence from our Phase 0 research:

| Tier | Pathways |
|---|---|
| **Verified core** | Sell, Discount, Divert |
| **Plausible — unverified** | Reroute, Store, Process |

Plausible-unverified pathways still compete honestly in the engine's ranking, but
they are visibly flagged in the UI and are never presented as field-validated. This
distinction is a first-class part of the product, not a footnote.

## Architecture

The decision engine is deterministic, pure TypeScript, and fully isolated from the
UI layer:

```
src/
  app/            Next.js routes (dashboard, batches, decisions)
  components/     shell / batch / decision / market / shared
  domain/
    engine/       six pathway evaluators + evaluateDecision() orchestrator
    types/        shared types (EvidenceTier, DecisionResult, RankedAction, ...)
  demo/
    data/         synthetic batch, market, and facility datasets
    scenarios/     curated scenario presets, decision-context builders
```

The engine computes:

```
expectedRecovery = saleableKg × realizablePrice
                    − transport − handling − storage − processing − riskAdjustment
```

for every feasible pathway, ranks them, and applies a narrow-margin policy before
returning a recommendation. Remaining useful life is path-aware — computed per
candidate through hold → transit → market dwell, not reused as a single static
batch value. No pathway is ever hard-coded to win; every recommendation traces
back to a real evaluation over the current scenario state.

## What's real vs. simulated

The product experience — UI, state management, interaction, and the decision
logic itself — is real and fully functional. What's simulated is the data it runs
on: telemetry, market prices, and facility/route state are synthetic and
indicative, since live integrations (AGMARKNET, IoT telemetry, field-verified
facility data) are out of scope for this stage and follow field validation.

This is disclosed in-product via a persistent `DEMO MODE` indicator and
`SIMULATION-LIMITED` confidence labeling — never presented as a calibrated,
production-trained result.

## Tech stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Recharts (where
a chart genuinely helps).

No backend, no database, no auth, no external API keys, no LLM in the decision
path — the arithmetic is deterministic and auditable. (An LLM may explain a
decision in natural language; it never computes one.)

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Enter Operations**, open any batch, and use
the scenario workspace to change thermal exposure, transit delay, market
strength, or condition — the ranking and recommendation recompute live.

```bash
npm run build   # production build
npm run lint    # lint check
```

## Known limitations

- Data is synthetic; economics are indicative, not measured.
- Confidence is simulation-limited, not calibrated against real outcomes.
- Reroute/Store/Process feasibility depends on assumptions (execution rights,
  facility/channel verification) not yet field-tested.
- Supporting pages (Markets, Facilities, Activity) are lighter-weight context
  views; the core reviewer flow is Dashboard → Batch → Decision.

---

Built for Build with Bharat 2.0, National Institute of Technology, Delhi.
