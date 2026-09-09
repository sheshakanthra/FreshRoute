# D2 ingestion — convergence diagnostic

`scripts/ingest/fetch.ts` + `normalize.ts` + `load.ts`, run repeatedly and
unchanged against the same source (data.gov.in resource `35985678-...`),
same filters (State=Tamil Nadu, Commodity=Tomato), same window
(2024-07-16 to now). Purpose: find out how many pulls it actually takes for
`market_price` to stop growing, after discovering that a single pull
undercounts (see `docs/data/schema-notes.md` / the D2 session that first
built this pipeline).

## Why repeated pulls surface different rows at all

`fetch.ts` walks the full State+Commodity result set via offset pagination
(this resource has no range-based date filter — only exact-day match — so
offset paging over the unfiltered result set, with the window cutoff applied
in `normalize.ts`, is the only way to retrieve history; see `fetch.ts`'s
header comment). The API returns the same **total row count** (126,578) on
every pull, but **does not guarantee stable ordering** across separate
requests — the same offset window can return a different subset of the
underlying rows from one call to the next. Total count staying fixed while
page content shifts is the signature of an unordered/non-cursor pagination
implementation on a backend that isn't holding a stable snapshot per query.

Practically: any single pull is a partial, non-deterministic sample of the
true row population. `load.ts`'s upsert is correctly idempotent for
identical input (proven earlier via Postgres's `xmax = 0` on the `RETURNING`
clause) — what's not deterministic is which rows a given pull's *raw fetch*
actually contains.

## The 5-run sequence

Each row inserted count is measured directly via `xmax = 0` on `load.ts`'s
upsert `RETURNING` clause — a real per-row Postgres signal for "this was a
genuine INSERT," not a before/after row-count diff.

| Run | Presented (normalized rows) | Inserted (xmax=0) | % of presented | `market_price` total after |
|---|---:|---:|---:|---:|
| 1 | 77,598 | 77,598 | 100.0% | 77,598 |
| 2 | 95,438 | 29,909 | 31.3% | 107,507 |
| 3 | 82,475 | 3,768 | 4.6% | 111,275 |
| 4 | 96,383 | 4,263 | 4.4% | 115,538 |
| 5 | 95,644 | 0 | 0.0% | 115,538 |

**Final corpus size: 115,538 rows in `market_price`.**

Run 4 is worth calling out on its own: extrapolating run 1→2→3's decay
(77,598 → 29,909 → 3,768) predicted run 4 would land in the low hundreds.
It instead ticked up to 4,263 (4.4%, essentially flat against run 3's 4.6%)
— the decay was not cleanly monotonic. That prediction was wrong. Run 5
then landed on the strongest possible convergence signal (exact zero), which
is why the sequence stopped there rather than on run 4's smaller-but-nonzero
result.

## What "converged" means here — and what it doesn't

Convergence in this document means: **this specific 5-pull sequence, run
back-to-back within a short window, stopped finding new rows for this fixed
historical window (2024-07-16 to now, TN tomato).** It is a property of the
sequence, not a permanent guarantee about the source.

It does **not** mean:

- That a pull run tomorrow, or next week, will also insert 0 rows for this
  same window. This API's pagination instability (above) means a fresh pull
  of "the same" historical window can still surface a small number of
  previously-missed rows purely from another non-deterministic sampling
  draw, independent of whether the underlying historical data itself
  changed at all.
- That the corpus is now permanently complete. It means the *known*
  undercounting from pagination instability has been driven to zero for
  this sequence — a different mechanism (e.g. the source correcting a
  historical price after the fact, which government mandi data does
  occasionally do) is a separate, smaller, and expected class of future
  drift, not a repeat of this diagnostic's finding.

**Operational implication for future runs:** a future pull that inserts a
handful of new rows against this same historical window is expected,
ordinary behavior — not a regression, not a sign the pipeline is broken,
and not a reason to re-run this same 5-pull convergence exercise. It only
becomes worth re-investigating if a future pull's insert count is large
relative to what's already loaded (comparable to run 1-3's scale here, not
a handful of rows), which would suggest something more than ordinary
pagination noise.
