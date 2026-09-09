# FreshRoute — Stage 0: Real Data + Persistence

**Goal:** move FreshRoute from a static prototype to a system that runs on real
Tamil Nadu market data, persists state, and can record what actually happened.

**Branch:** `stage-0-data` — `main` stays deployed and untouched.

**Sessions:** D0 → D4, run one at a time. Each has a gate. Do not start the next
session until the current gate passes.

---

## Standing rules (all sessions)

1. The agent never runs `git` commands. I commit.
2. No AI co-author attribution in commits or files.
3. One session at a time. Stop and report at the gate.
4. Never fabricate, impute or simulate market data. NULL stays NULL.
5. Raw fetched data is preserved byte-for-byte, separately from normalized data.
6. Every externally sourced record carries provenance: source, url, fetched_at,
   license, raw_row_hash.
7. The decision engine stays framework-free — it must not import DB or HTTP code.
8. If a source can't be accessed, record the failed attempt. Never substitute
   recalled knowledge for a failed fetch.

---

## Architecture decisions (fixed — do not re-litigate mid-session)

| Decision | Choice | Why |
|---|---|---|
| Database | Postgres (Neon) | Serverless, works with Vercel, real Postgres |
| ORM/migrations | Drizzle | TS-native, explicit SQL migrations, light |
| Language | TypeScript throughout | Engine is already TS; don't split the stack |
| Raw storage | Files on disk / object store | Immutable, re-normalizable without re-fetching |

**Schema principles that are not optional:**

- `org_id` on every domain table from the first migration. Multi-tenancy is a
  schema decision, not an auth feature — retrofitting it is a rewrite.
- Telemetry is **append-only**. Never UPDATE a telemetry row.
- Model outputs (quality score, RUL) live in `condition_assessment`, **not** as
  authoritative columns on `batch`. A batch row must never claim to know its own
  remaining life.
- Outcome-capture tables exist from the **first** migration even though nothing
  writes to them until D4. This is the single most expensive thing to defer.
- `variety` is a first-class required dimension on price records, not optional.
- `demand_source` enum (`ARRIVALS_OBSERVED` | `ABSENT`) so the engine degrades
  gracefully when arrivals data is missing.

---

## D0 — Data source verification and one-shot pull

**This session gates everything else. If it fails, do not build the schema.**

### Scope
Prove we can actually retrieve ≥12 months of real Tamil Nadu tomato market data
for 4–5 markets, and measure its quality.

```
Verify and pull real Tamil Nadu tomato market data. This is data validation
only — do NOT touch the app, do NOT create a schema, do NOT write app code.

Write only under data/validation/ and docs/data/.

ATTEMPT ORDER (stop early only on clean success):
1. data.gov.in AGMARKNET resource, using a REGISTERED api key from env
   DATA_GOV_IN_API_KEY. If unset, stop and tell me — do not use a demo key.
2. Tamil Nadu agricultural marketing sources (agrimark.tn.gov.in) — check for
   downloadable historical files, not just a query UI.
3. AGMARKNET native portal (arrivals column is confirmed present here).
4. Any published cleaned AGMARKNET-derived dataset. Record its LICENCE first
   and whether redistribution is permitted.

MARKETS (candidates, not locked):
Dindigul, Oddanchatram, Palladam, Madurai, Salem.

FIELDS to capture per record (raw + normalized, NULL-tracked):
market_name, district, state, commodity, variety, grade, arrival_qty,
arrival_unit, min_price, max_price, modal_price, price_unit, price_date,
fetched_at, source, source_url, raw_row_hash, license

PRESERVATION:
- Raw: data/validation/raw/<source>/<market>_<pulldate>.<ext>, byte-for-byte,
  never edited. Each raw file paired with a .meta.json (url, params,
  http_status, fetched_at, row_count, sha256).
- Normalized: data/validation/normalized/tomato_tn.csv — a read-only transform
  over raw. Prices → INR/kg (source is usually INR/quintal; keep both).
  Arrivals → kg, NULL preserved. Dates → ISO-8601. Names mapped via a
  checked-in lookup table; unmapped values flagged, never silently coerced.

MEASURE, per market × variety, and write to docs/data/validation-report.md:
- reporting continuity (reporting days ÷ expected trading days)
- missing-day list + longest gap
- duplicate count on (market, commodity, variety, date)
- null-arrivals fraction
- distinct-value rate (catches carry-forward padding faking continuity)
- implausible-value rate (outside a plausible INR/kg band — unit-error detector)
- min/max/modal availability
- naming-variant count per normalized entity
- publication lag (median fetched_at − price_date) if computable
- historical depth (span, qualified by continuity)

VERDICT — compute and state plainly:
PASS    ≥4 markets, ≥12 months, ≥70% continuity, distinct-value rate confirms
        real reporting, modal ≥90% present, arrivals ≥50% on ≥3 markets,
        ≤5% implausible, licences recorded.
PARTIAL real usable data but a threshold missed — state exactly which.
FAIL    can't land ≥12 months × ≥3 markets at ≥50% continuity from any path.

Simulated or imputed data must NOT move any metric toward PASS.

Stop and report. Do not proceed to D1.
```

### Gate
`docs/data/validation-report.md` exists with a real PASS/PARTIAL/FAIL verdict
backed by measured numbers, and raw files on disk.

**If PARTIAL:** proceed to D1, but record the limitation in
`docs/data/schema-implications.md` — specifically whether `demand_source` will
be `ABSENT` in practice.

**If FAIL:** stop. Do not design the schema. Find a source first.

---

## D1 — Schema and migrations

### Scope
Postgres schema with Drizzle. Migrations only — no app wiring yet.

```
Set up Postgres (Neon) + Drizzle and write the initial migration.
No app wiring in this session. Schema only.

TABLES:

organization        id, name, type (FPO/COLLECTION_CENTRE/AGGREGATOR), created_at

commodity           id, code, name, climacteric (bool), quality_floor_fresh,
                    quality_floor_process, optimal_temp_c, chilling_threshold_c,
                    optimal_humidity_min/max, q10, base_decay_points_per_hour,
                    notes

batch               id, org_id FK, commodity_id FK, external_ref,
                    quantity_kg, variety, ripeness_stage, precooled (bool),
                    packaging_type, origin, current_location,
                    harvest_timestamp, cost_basis_inr, status enum,
                    created_at, updated_at
                    -- NO quality_score, NO remaining_useful_life_hours here.
                    -- Those are model outputs; they live in condition_assessment.

batch_telemetry     id, batch_id FK, recorded_at, ingested_at, temperature_c,
                    humidity_pct, sensor_id, data_source enum
                    (OBSERVED/SIMULATED/USER_REPORTED), dedupe_key
                    -- APPEND ONLY. Index (batch_id, recorded_at DESC).

condition_assessment id, batch_id FK, computed_at, quality_score,
                    decay_points_per_hour, remaining_useful_life_hours,
                    model_name, model_version, input_snapshot jsonb

market              id, name, district, state, lat, lon, external_code,
                    aliases jsonb

market_price        id, market_id FK, commodity_id FK, variety, grade,
                    price_date, min_price_inr_per_kg, max_price_inr_per_kg,
                    modal_price_inr_per_kg, raw_price_value, raw_price_unit,
                    arrival_qty_kg (nullable), raw_arrival_value,
                    raw_arrival_unit, demand_source enum
                    (ARRIVALS_OBSERVED/ABSENT), source, source_url,
                    fetched_at, license, raw_row_hash
                    -- UNIQUE (market_id, commodity_id, variety, grade, price_date)

lane                id, origin_ref, destination_market_id FK, distance_km,
                    typical_transit_hours, road_quality_index, mode

storage_facility    id, name, lat, lon, storage_temp_c, storage_humidity_pct,
                    cost_per_kg_per_day, capacity_kg, max_storage_days

processing_facility id, name, lat, lon, gate_price_per_kg, yield_ratio,
                    min_quality_score, daily_capacity_kg, product_form

action_type         code PK, name, description, evidence_tier enum
                    (VERIFIED/PLAUSIBLE_UNVERIFIED/REFUTED)
                    -- seed: SELL/DISCOUNT/DIVERT = VERIFIED
                    --       REROUTE/STORE/PROCESS = PLAUSIBLE_UNVERIFIED

recommendation      id, batch_id FK, org_id FK, generated_at, valid_until,
                    chosen_action_code FK, destination_ref,
                    expected_recoverable_value_inr, baseline_value_inr,
                    modelled_uplift_inr, spoilage_probability,
                    baseline_spoilage_probability, confidence,
                    reasons jsonb, cost_breakdown jsonb,
                    engine_version, model_versions jsonb,
                    feature_snapshot jsonb, data_provenance jsonb,
                    contains_simulated_data bool,
                    status enum (ISSUED/ACCEPTED/REJECTED/OVERRIDDEN/EXPIRED),
                    superseded_by_id nullable FK

recommendation_candidate  id, recommendation_id FK, action_code FK,
                    destination_ref, expected_value_inr, spoilage_probability,
                    quality_at_sale, exposure_hours, feasible bool,
                    infeasible_reason, rank, costs jsonb
                    -- every evaluated option, not just the winner.
                    -- This is the audit trail AND the future training set.

action_execution    id, recommendation_id FK, executed_at, executed_action_code,
                    executed_by, notes
                    -- written in D4

outcome_record      id, batch_id FK, recommendation_id FK nullable,
                    recorded_at, realized_value_inr, realized_loss_kg,
                    actual_destination, notes, data_source enum
                    -- written in D4. MUST exist in this migration.

ingestion_run       id, source, started_at, finished_at, status,
                    rows_fetched, rows_inserted, rows_rejected, error_summary

REQUIREMENTS:
- org_id on batch, recommendation, outcome_record.
- All timestamps timestamptz.
- Seed commodity with tomato using the researched parameters (cite sources in
  a comment). Seed action_type with the six actions and their evidence tiers.
- Write docs/data/schema-notes.md explaining the non-obvious choices:
  why condition_assessment is separate, why telemetry is append-only,
  why outcome tables exist before anything writes to them.

Stop and report. Do not wire the app yet.
```

### Gate
Migration runs clean against a fresh Neon database. Seeds present. Schema notes
written.

---

## D2 — Ingestion pipeline

### Scope
Turn the D0 one-shot pull into a repeatable, idempotent pipeline.

```
Build the market data ingestion pipeline. Reads real sources, writes to
market_price. Do not touch the engine or the UI.

REQUIREMENTS:
- scripts/ingest/fetch.ts     — pulls raw, writes to raw store + .meta.json
- scripts/ingest/normalize.ts — raw → normalized rows (units, names, nulls)
- scripts/ingest/load.ts      — upsert into market_price, idempotent on the
                                unique key. Re-running must never duplicate.
- Every run writes an ingestion_run row with counts and errors.
- Rejected rows are logged with a reason, never silently dropped.
- Unit normalization: quintal → kg. Store BOTH raw and normalized values.
- demand_source set per row: ARRIVALS_OBSERVED if arrival_qty present, else ABSENT.
- Name mapping via a checked-in lookup table. Unmapped → rejected + logged,
  never guessed.
- Backfill command: pull and load the full historical window from D0.

VERIFY:
- Run the backfill. Report rows loaded per market and date range.
- Run it a SECOND time. Row count must not change (idempotency proof).
- Report the demand_source split (how many ARRIVALS_OBSERVED vs ABSENT).

Stop and report.
```

### Gate
Backfill loads real rows. Second run is a no-op. `ingestion_run` populated.

---

## D3 — Persistence swap

### Scope
Engine reads from the database instead of static fixtures. Engine logic itself
does not change.

```
Wire the app to Postgres. The decision engine's logic must NOT change in this
session — only where its inputs come from.

- Repository layer: batches, telemetry, market prices, facilities, lanes.
- A context_builder that converts DB rows into the engine's framework-free
  input types. The engine must not import Drizzle or any DB code.
- Batch CRUD: create a batch, it persists across reload.
- Telemetry append endpoint: adding a reading creates a new condition_assessment
  row and can change the recommendation.
- Generating a recommendation persists: the recommendation row, ALL evaluated
  candidates (recommendation_candidate), the feature_snapshot, engine_version
  and model_versions.
- Recommendations carry valid_until and expire.
- Market prices come from market_price, latest available per market — with the
  price_date and fetched_at surfaced so staleness is visible.
- Where demand_source is ABSENT for the chosen market, reduce confidence and
  say so in the reasons.

VERIFY on 3 batches: create → add telemetry → generate recommendation →
reload page → state persists → candidates queryable from the DB.

Stop and report.
```

### Gate
A batch created in the UI survives a reload. A recommendation and all its
candidates are queryable in Postgres.

---

## D4 — Outcome capture

### Scope
Close the loop. This is what makes future ML possible.

```
Add outcome capture. Small session, high leverage.

- Accept / Reject / Override controls on the recommendation card.
  Override requires choosing which action was actually taken.
- Writes action_execution.
- A simple "record outcome" form: realized value, realized loss, actual
  destination, notes → outcome_record.
- Recommendation status transitions: ISSUED → ACCEPTED/REJECTED/OVERRIDDEN,
  and → EXPIRED past valid_until.
- A queryable view joining recommendation → execution → outcome. This is the
  future training set; make it easy to export as CSV.

Show in the UI, on any recommendation that lands on REROUTE, STORE or PROCESS,
that the action's evidence_tier is PLAUSIBLE_UNVERIFIED — a visible flag, not
a footnote.

Stop and report.
```

### Gate
Accept a recommendation, record an outcome, export the joined view as CSV with
at least one real row in it.

---

## After Stage 0

With real prices in Postgres and outcome capture live, the next thing is the
**backtest**: replay 12 months, engine vs default plan, measure the difference.
That is the moment you find out whether FreshRoute has a product in it.

Do not start Stage 1 until D4's gate passes.