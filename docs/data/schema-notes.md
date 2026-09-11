# D1 — Schema and migrations: notes

Postgres schema for FreshRoute, applied via Drizzle. This session is schema
and seeds only — no app wiring. Ran and verified against the real Neon
database in `.env`'s `DATABASE_URL` (not a mock, not a dry run — see
"Verification" below).

## Non-obvious choices STAGE0 asked to be explained

### Why `condition_assessment` is separate from `batch`

A batch row describes a physical thing: how much, of what, from where, in
what packaging. Quality score and remaining useful life are not physical
facts about the batch — they're a model's *opinion* about the batch at a
point in time, produced by a specific model version from a specific set of
inputs. If those lived as columns on `batch`, the batch table would be
silently rewritten every time the model runs, there would be no history of
what the model believed yesterday versus today, and two different model
versions could never be compared against each other for the same batch.
`condition_assessment` keeps every computation — `computed_at`, `model_name`,
`model_version`, and `input_snapshot` (exactly what the model saw) — as its
own immutable row. `batch` never claims to know its own remaining life.

### Why `batch_telemetry` is append-only

Telemetry is the raw evidence a quality/RUL model is later judged against.
If a bad reading could be corrected by UPDATE, two things become impossible
to tell apart: "the sensor reported 4°C and someone fixed a data-entry
mistake" versus "the sensor reported 4°C and someone quietly made an
inconvenient reading disappear." Once any row can be edited, none of them
are trustworthy as an audit trail. So this schema does not rely on
convention — migration `0001_telemetry_append_only_trigger.sql` adds a
`BEFORE UPDATE OR DELETE` trigger on `batch_telemetry` that raises an
exception unconditionally, including when the delete arrives via an
`ON DELETE CASCADE` from a `batch` row being removed. Verified directly
against the live database (see below): UPDATE, DELETE, and cascade-DELETE
are all rejected. A wrong reading gets corrected the same way a wrong
ledger entry does — a new, later row, not an edit to the old one.

### Why `outcome_record` (and `action_execution`) exist before D4 writes to them

Nothing in D1–D3 writes to `outcome_record`. It's created now because the
alternative — adding it in D4 — means every `recommendation` issued between
D1 and D4 has no way to ever be linked to what actually happened. The whole
point of Stage 0 (per STAGE0.md's closing section) is to reach a backtest:
replay history, compare the engine's recommendation against the default
plan and against what was actually done. That comparison needs ground truth
rows going back to the first recommendation ever issued, not just the ones
issued after someone remembered to add the table. Creating it late doesn't
just lose a bit of data — it moves the earliest possible backtest date
forward by however long that took, permanently.

## D0-driven schema requirements applied

These respond directly to `docs/data/schema-implications.md` (the D0 gate's
output) and the explicit requirements given for this session.

### `market.market_type` — stored, not derived

D0 measured that Uzhavar Sandhai (retail farmers' markets) and APMC
(wholesale) price levels are not comparable, and that deriving the split
from a name-string pattern at query time is exactly the mistake that leads
to mixing them. `market_type` (`APMC | UZHAVAR_SANDHAI | OTHER`) is a
`NOT NULL` column on `market`, populated once at seed/ingest time from the
measured lookup table, not computed by every consumer of the table.

### `market_alias` — the checked-in lookup table, materialized

D0 measured 455 raw AGMARKNET market-name strings collapsing to 275 real
markets — the same Uzhavar Sandhai market is listed twice a day under a
plain name and an `" APMC"`-suffixed name, 99.9% price-identical on shared
days. `market` holds only the 275 canonical rows. `market_alias` is the
lookup table (`raw_name UNIQUE → market_canonical_id`), seeded from
`data/validation/lookup/markets_tn.csv` by `scripts/db/seed.ts`. D2's
loader resolves every raw source name through this table before insert; an
unresolvable name must be rejected and logged, never guessed into a
canonical row (`market_alias.rawName` seed logic follows this: a raw name
with no resolvable canonical is skipped and printed as `REJECTED`, not
inserted under a best-guess).

`market_price` does **not** carry its own `market_canonical_id` column
alongside `market_id`. That would be two names for the same fact: `market_id`
on `market_price` already always points at a canonical `market` row (never
a raw/duplicate label), because that resolution happens once, at ingest,
via `market_alias`. `market_price.is_duplicate_listing` and
`.duplicate_source_count` instead operationalize the *other* half of the
D0 finding — when a canonical (market, commodity, variety, grade, date) key
was listed more than once in the raw source, that fact is flagged on the
row, not silently discarded. The `UNIQUE(market_id, commodity_id, variety,
grade, price_date)` index is what actually stops the duplicate from
becoming two rows.

### `market_price.demand_source` defaults to `ABSENT`

D0 attempted three further paths (AGMARKNET, agrimark.tn.gov.in, a form
UI) after finding the data.gov.in archive resource has no arrivals column
at all — recorded in `data/validation/source_attempts.json`. This isn't
sparse data that a wider pull would fix; the field doesn't exist at any
source reached so far. `demand_source` defaults to `ABSENT` rather than to
`ARRIVALS_OBSERVED`, so a loader that forgets to set it explicitly fails
safe (records "no signal") instead of silently claiming a signal that was
never observed. `arrival_qty_kg` and its `raw_arrival_value`/`raw_arrival_unit`
pair stay nullable rather than being dropped from the schema — so if a
scraper or a future resource does supply arrivals later, it's a loader
change, not a migration.

### Raw price value + unit, alongside normalized

`market_price` stores `raw_price_value` + `raw_price_unit` (source is
INR/quintal) next to `min/max/modal_price_inr_per_kg`. If the conversion
factor is ever found to be wrong, every row is recoverable by
re-normalizing in place — no re-fetch of the source needed. Source data are
integers in rupees per quintal; the normalized columns use
`numeric(8,4)` to hold the exact quotient without rounding.

## org_id — which tables have it, and why

Every table that represents **one tenant's operational data** carries
`org_id`, from this first migration: `batch`, `batch_telemetry`,
`condition_assessment`, `recommendation`, `recommendation_candidate`,
`action_execution`, `outcome_record`. This is a superset of the three
tables named explicitly in the D1 brief (`batch`, `recommendation`,
`outcome_record`) — extended consistently to their child/detail tables
(telemetry and condition assessments belong to one org's batch;
candidates and executions belong to one org's recommendation) per the
broader standing rule ("org_id on every domain table... retrofitting it is
a rewrite"). Stopping at only the three named tables while leaving their
direct children unscoped would have been an arbitrary line.

`org_id` is deliberately **absent** from:
- **Reference/dimension tables** — `commodity`, `market`, `market_alias`,
  `market_price`, `lane`, `storage_facility`, `processing_facility`,
  `action_type`. A market price or a commodity's postharvest physiology is
  shared, objective fact — no tenant "owns" the price Dindigul tomatoes
  traded at yesterday. Scoping these to an org would mean re-fetching and
  duplicating the same public data per tenant for no reason.
- **`ingestion_run`** — a system/ops table tracking a data pull performed on
  behalf of the whole system, not one tenant.

## Judgment calls made without an explicit spec value

STAGE0 left a few enum value sets and a couple of numeric parameters
unspecified. Recorded here rather than left implicit in code:

- **`batch.status`**: `ACTIVE | IN_TRANSIT | CLOSED | DISCARDED` — coarse
  operational lifecycle, distinct from `recommendation.status` (the
  decision lifecycle) and from the domain layer's UI-facing `BatchStatus`
  (`NORMAL/AT_RISK/...`, a *display* concern computed from live data, not a
  stored fact).
- **`outcome_record.data_source`**: `OPERATOR_REPORTED | SYSTEM_INFERRED`.
- **`ingestion_run.status`**: `RUNNING | SUCCESS | PARTIAL | FAILED`.
- **`lane.mode`**: `ROAD | RAIL | MULTIMODAL` — kept as a narrow enum
  rather than free text so a typo can't silently create a new "mode".
- **Tomato commodity parameters** (`scripts/db/seed.ts` has the full
  citation comment): `optimal_temp_c`, `chilling_threshold_c`,
  `optimal_humidity_min/max`, and `q10` are drawn from postharvest
  physiology literature (USDA Agricultural Handbook 66; Kader (ed.),
  *Postharvest Technology of Horticultural Crops*, UC ANR Publication
  3311). `quality_floor_fresh`, `quality_floor_process`, and
  `base_decay_points_per_hour` are engineering estimates derived from
  typical shelf-life figures in that same literature, not lab-measured
  constants — labelled as such in the seed comment rather than given false
  precision.

## Files

```
drizzle.config.ts
src/db/schema/            # enums, organization, commodity, market,
                           # marketPrice, batch, facilities, actionType,
                           # recommendation, ingestion, index.ts (barrel)
src/db/client.ts           # DB client factory — used by scripts only,
                           # not imported by any app route/page yet
drizzle/
  0000_past_sir_ram.sql              # generated by drizzle-kit from schema
  0001_telemetry_append_only_trigger.sql   # hand-written, custom migration
  meta/                               # drizzle-kit journal, snapshots
scripts/db/
  seed.ts                            # idempotent; see "Verification" below
  verify.ts                          # gate-verification script, kept as
                                      # reusable tooling (queries the live
                                      # DB directly, doesn't trust CLI output)
docs/data/schema-notes.md            # this file
```

## Verification

Ran against the live Neon database identified by `DATABASE_URL` in `.env`
— not a local/mock database.

```
npx drizzle-kit generate    # -> drizzle/0000_past_sir_ram.sql (17 tables)
                             #    (0001 was hand-written for the trigger)
npx drizzle-kit migrate     # applied both migrations, exit clean
npx tsx scripts/db/seed.ts  # org, commodity, action_type, market + alias
npx tsx scripts/db/verify.ts
```

Measured results (`scripts/db/verify.ts` queries `information_schema` /
`pg_catalog` directly, not the CLI's own success message):

- **17 tables** created, matching the schema (`select * from information_schema.tables`).
- **10 enums**, values as declared.
- **22 unique indexes**, including the two load-bearing ones:
  `market_price_unique_series_day` (market_id, commodity_id, variety, grade,
  price_date) and `market_alias_raw_name_unique`.
- **Append-only trigger, proven, not assumed**: a test batch/telemetry row
  was inserted, then UPDATE, DELETE, and a cascade-DELETE (via deleting the
  parent `batch`) were each attempted and each rejected by the trigger. The
  whole test runs inside a transaction that always rolls back, so re-running
  `verify.ts` never leaves residue.
- **Seed row counts**: `organization: 1`, `commodity: 1`, `action_type: 6`,
  `market: 275`, `market_alias: 455`, `market_price: 0` (correct — D2 loads
  price facts, D1 does not).
  `market: 275` and `market_alias: 455` match D0's measured numbers exactly
  (`data/validation/lookup/markets_tn.csv`), with **0 rejected** aliases —
  every raw name in the D0 pull resolved to a canonical market.
- Re-running `scripts/db/seed.ts` a second time is a no-op on every table
  (upsert-by-natural-key throughout: `commodity.code`, `action_type.code`,
  `market_alias.raw_name`, `market` by (name, district)).

## Gate

Migration runs clean against the real Neon database (verified directly, not
assumed from CLI exit codes). Seeds present and idempotent. This file
written. No app wiring performed. D1 complete; D2 not started.
