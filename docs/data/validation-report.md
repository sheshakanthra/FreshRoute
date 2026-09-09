# D0 — Data source verification and one-shot pull

_Generated 2026-09-09T13:34:27.457810+00:00 — all figures measured from the pull described below. Nothing simulated, imputed or recalled._

## Verdict: **PARTIAL**

Real, usable, multi-year Tamil Nadu tomato price data was retrieved and measured. Two PASS thresholds are missed, both stated exactly below.

| PASS criterion | Required | Measured | Result |
|---|---|---|---|
| Markets | ≥4 | 4 at ≥70% continuity (market level) | **met** |
| Markets, variety-controlled | ≥4 | **3** market×variety series at ≥70% | **MISSED** |
| History | ≥12 months | 365 days measured; dense archive from 2024-07-16 (~26 months) | **met** |
| Continuity | ≥70% | 88.5%, 75.6%, 86.6%, 47.1%, 87.7% | 4 of 5 met |
| Modal price present | ≥90% | 100.0% on every selected series | **met** |
| Arrivals quantity | ≥50% on ≥3 markets | **0% — field does not exist at source** | **MISSED** |
| Implausible values | ≤5% | 0.00% on selected series; 0.85% dataset-wide | **met** |
| Distinct-value rate confirms real reporting | yes | confirmed by carry-forward test (below) | **met** |
| Licence recorded | yes | GODL-India | **met** |

### The two misses

1. **Arrivals quantity is absent, not sparse.** The resource has no arrivals column at all, so `demand_source` will be `ABSENT` for 100% of rows. This is a source limitation, not a gap that a longer pull would close.
2. **Variety-controlled continuity clears 70% on only 3 series, not 4.** At market level 4 markets qualify, but Hasthampatti splits its reporting across two varieties (Deshi 39.5%, Local 36.4%), so neither variety alone clears the bar. Since dispersion must be variety-controlled, 3 is the binding number.

---

## What was pulled

| | |
|---|---|
| Source | data.gov.in resource `35985678-0d79-46b4-9ed6-6f13308a1d24` — "Variety-wise Daily Market Prices Data of Commodity" |
| Filters | `State=Tamil Nadu`, `Commodity=Tomato` |
| Rows retrieved | **126,578** across 26 pages, 0 failed attempts |
| Pull date | 2026-09-09 |
| Data span | 2005-08-22 → 2026-09-08 |
| Licence | https://data.gov.in/government-open-data-license-india |
| Auth | registered key from `DATA_GOV_IN_API_KEY` (no demo key used) |

### Resource selection — the snapshot resource is unusable for history

The originally-specified resource `9ef84268-d588-465a-a308-a864a43d0070` is a **current-day snapshot whose `arrival_date` filter is silently ignored**. Asking for `09/09/2025` returns rows dated `09/09/2026`, and `total` stays at 17,319 for any in-range date. A date filter that appears to work but returns today's rows is worse than one that errors — it would have produced 365 identical files labelled as different days.

Resource `35985678-…` is a genuine archive (81,704,653 rows total) and honours `State`/`Commodity`/`Arrival_Date` filters, so the whole history came back in 26 paged requests rather than 365 dated ones.

### Measured API limits

| Measurement | Result |
|---|---|
| Rate ceiling | 20 consecutive requests: 0 non-200, no 429, no throttling |
| Throughput | 1.07 req/s sequential; median latency 0.82 s |
| Max page size | 5,000 rows (10,000 fails with `IncompleteRead`) |
| Offset paging | reliable to end of set (offset 126,000 → exactly 578 rows) |

> A missing `User-Agent` header caused every request to hang to a 60 s timeout. With the header, the same calls return in ~1 s. Any ingestion code must send one.

---

## Data quality findings

### Duplicate listings — 25.4% of the pull

`455` raw market names collapse to `275` real markets. AGMARKNET lists many Uzhavar Sandhai markets **twice on the same day** under both `X (Uzhavar Sandhai)` and `X (Uzhavar Sandhai) APMC`. These are not distinct markets and not a rename:

- the two labels **overlap** on shared days (mean 36.5 shared days across 179 pairs; only 2 pairs disjoint)
- on those shared days the prices are **99.9% identical** (6,524 identical vs 4 differing)

Left uncollapsed this would have double-counted 32,213 rows and manufactured fake price dispersion between a market and itself. The normalizer strips the ` APMC` suffix when the name already contains `Uzhavar Sandhai`, records the action in `mapping_note`, and flags — but never deletes — the duplicate rows.

### `market_type` — never mix the two

Every selected market is `UZHAVAR_SANDHAI` (farmers' market, retail-facing). The 94 names carrying neither token are `APMC` wholesale and are almost entirely the dead 2005–2013 tail. Dispersion is therefore computed only within `UZHAVAR_SANDHAI` and within a single variety.

### Carry-forward test — the low distinct-value rate is a price grid, not padding

Distinct-value rates of 0.09–0.34 would normally suggest carry-forward padding faking continuity. Testing the actual series says otherwise:

| Market / variety | Obs | Price changed | Longest unchanged run | Runs ≥7d |
|---|---:|---:|---:|---:|
| Dindigul (Uzhavar Sandhai) | Deshi | 314 | 64.5% | 10d | 1 |
| Hasthampatti (Uzhavar Sandhai) | Deshi | 144 | 74.1% | 7d | 1 |
| Hasthampatti (Uzhavar Sandhai) | Local | 133 | 84.8% | 3d | 0 |
| Chokkikulam (Uzhavar Sandhai) | Deshi | 313 | 69.6% | 7d | 1 |
| Palladam (Uzhavar Sandhai) | Local | 157 | 42.9% | 11d | 4 |
| Denkanikottai (Uzhavar Sandhai) | Deshi | 300 | 49.8% | 18d | 4 |

Prices move on 43–85% of consecutive observations. That is real reporting. The low distinct-value rate comes from quotes landing on round rupee values, not from repetition. **Denkanikottai is the weakest** (49.8% change rate, an 18-day flat run) and should be watched.

### Arrivals

No arrivals column exists in this resource. Other paths were attempted and recorded in `data/validation/source_attempts.json`:

| Source | Outcome |
|---|---|
| `agmarknet_portal` | REACHED — HTTP 200, no arrivals data or download link in served HTML |
| `agmarknet_pricearrival` | REACHED — HTTP 200, no arrivals data or download link in served HTML |
| `tn_agrimark` | REACHED — HTTP 200, no arrivals data or download link in served HTML |
| `tn_uzhavarsandhai` | FAILED — URLError(gaierror(11001, 'getaddrinfo failed')) |
| `data_gov_in_root` | REACHED — HTTP 200, no arrivals data or download link in served HTML |

AGMARKNET and agrimark.tn.gov.in are reachable but expose arrivals only behind JS/ASP.NET postback forms; nothing downloadable was found from the landing documents. Extracting arrivals means building a form-driven scraper, which is out of D0 scope. **No arrivals figure has been invented to fill this.**

---

## Per-market measurements — 12 months

Window `2025-09-09` → `2026-09-08` (365 days). Continuity denominator is calendar days; Uzhavar Sandhai markets trade daily.

| Market | District | Reporting days | Continuity | Name variants | Varieties |
|---|---|---:|---:|---:|---|
| Dindigul (Uzhavar Sandhai) | Dindigul | 323 | 88.5% | 2 | Deshi 314, Other 9 |
| Hasthampatti (Uzhavar Sandhai) | Salem | 276 | 75.6% | 2 | Deshi 144, Local 133 |
| Chokkikulam (Uzhavar Sandhai) | Madurai | 316 | 86.6% | 2 | Deshi 313, Other 3 |
| Palladam (Uzhavar Sandhai) | Thirupur | 172 | 47.1% | 2 | Local 157, Deshi 10, Other 5 |
| Denkanikottai (Uzhavar Sandhai) | Krishnagiri | 320 | 87.7% | 2 | Deshi 300, Local 20 |

## Per-market × variety — 12 months (the series the engine must actually use)

| Market | Variety | Days | Continuity | Dup rows | Longest gap | Distinct-value rate | Modal avail | Implausible | Median ₹/kg |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dindigul (Uzhavar Sandhai) | Deshi | 314 | 86.0% | 116 | 9d | 0.172 | 100.0% | 0.0% | 27.5 |
| Chokkikulam (Uzhavar Sandhai) | Deshi | 313 | 85.8% | 100 | 4d | 0.192 | 100.0% | 0.0% | 26.0 |
| Denkanikottai (Uzhavar Sandhai) | Deshi | 300 | 82.2% | 99 | 4d | 0.09 | 100.0% | 0.0% | 20.0 |
| Palladam (Uzhavar Sandhai) | Local | 157 | 43.0% | 86 | 170d | 0.172 | 100.0% | 0.0% | 17.5 |
| Hasthampatti (Uzhavar Sandhai) | Deshi | 144 | 39.5% | 47 | 34d | 0.34 | 100.0% | 0.0% | 25.0 |
| Hasthampatti (Uzhavar Sandhai) | Local | 133 | 36.4% | 66 | 170d | 0.301 | 100.0% | 0.0% | 20.0 |
| Denkanikottai (Uzhavar Sandhai) | Local | 20 | 5.5% | 4 | 312d | 0.3 | 100.0% | 0.0% | 17.5 |
| Palladam (Uzhavar Sandhai) | Deshi | 10 | 2.7% | 3 | 158d | 0.8 | 100.0% | 0.0% | 20.25 |
| Dindigul (Uzhavar Sandhai) | Other | 9 | 2.5% | 1 | 233d | 0.778 | 100.0% | 0.0% | 17.5 |
| Palladam (Uzhavar Sandhai) | Other | 5 | 1.4% | 5 | 186d | 0.6 | 100.0% | 0.0% | 16.5 |

`null_arrivals_pct` is 100.0 for every row above — omitted from the table because it is constant.

### Markets that were specified but are not usable

- **Oddanchatram** — zero rows in the entire TN tomato archive, under any spelling. This is the major tomato APMC in Dindigul district, so its absence is a real limitation, not a naming problem.
- **Madurai (town APMC)** — 22 rows, all 2005–2009. Substituted with `Chokkikulam (Uzhavar Sandhai)`, which is in Madurai district and reports 316 days.
- **Salem (town APMC)** — no rows under that name. Substituted with `Hasthampatti (Uzhavar Sandhai)`, Salem district.
- **Palladam** — present but only 47.1% continuity; retained for transparency, excluded from the qualifying count.

## Publication lag

Latest `price_date` in the archive is 2026-09-08; the pull ran 2026-09-09. Publication lag is therefore **~1 day**. A per-row median lag is not computable from a single pull — it needs repeated fetches over time, which D2 will produce.

## Historical depth, qualified by continuity

The archive nominally reaches back to 2005-08-22, but that tail is negligible: 87–193 rows per year for 2005–2013, then **nothing between 2014 and 2023**. Usable depth begins **2024-07-16**, giving ~26 months of dense daily reporting (2024: 24,829 rows; 2025: 49,203; 2026: 51,323). Do not treat the 2005 date as the start of a usable series.

---

## Files produced

```
data/validation/raw/datagovin_variety_archive/
    tn_tomato_p000..p025_2026-09-09.json      # 26 pages, byte-for-byte, never edited
    *.meta.json                                    # url, params, http_status, fetched_at, row_count, sha256
    _manifest_2026-09-09.json
data/validation/normalized/tomato_tn.csv           # read-only transform, ₹/kg + raw ₹/quintal preserved
data/validation/lookup/markets_tn.csv              # 455 raw names -> 275 canonical, with mapping_note
data/validation/lookup/varieties_tomato.csv
data/validation/metrics.json
data/validation/carryforward.json
data/validation/source_attempts.json
docs/data/validation-report.md
docs/data/schema-implications.md
```

API keys are redacted to `<DATA_GOV_IN_API_KEY>` in every stored URL.

## Gate

**PARTIAL.** Per STAGE0, D1 may proceed, with the arrivals limitation recorded in `docs/data/schema-implications.md`. D1 has not been started.