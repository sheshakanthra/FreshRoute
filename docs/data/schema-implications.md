# Schema implications of the D0 PARTIAL verdict

Written at the D0 gate. These are constraints the D1 schema must respect, derived
from measured data — see `validation-report.md` for the numbers behind each one.

## 1. `demand_source` will be `ABSENT` in practice — for 100% of rows

The data.gov.in archive resource (`35985678-…`) has **no arrivals column at all**.
This is not sparsity that a wider pull would fix; the field does not exist at source.
AGMARKNET and agrimark.tn.gov.in expose arrivals only behind JS/ASP.NET postback
forms (attempts recorded in `data/validation/source_attempts.json`).

Consequences for D1:

- `market_price.arrival_qty_kg`, `raw_arrival_value`, `raw_arrival_unit` stay in the
  schema and stay **nullable**. Do not drop them — a scraper or a future resource
  could fill them, and retrofitting the columns later means rewriting the loader.
- `demand_source` keeps its enum but will be written as `ABSENT` on every row D2
  loads. The `ARRIVALS_OBSERVED` branch will be **unexercised in production** until
  an arrivals source lands.
- The engine must therefore treat "no demand signal" as the **normal** path, not the
  degraded exception. Any code path that silently assumes arrivals exist is dead code
  today and a latent bug tomorrow.
- D3's requirement to "reduce confidence and say so in the reasons where
  `demand_source` is ABSENT" will fire on **every** recommendation. Confidence
  reduction must be calibrated with that in mind, or every recommendation ships at
  artificially low confidence and the signal becomes meaningless.

## 2. `variety` must be required, and dispersion must be variety-controlled

Measured: only **3** market×variety series clear 70% continuity, versus 4 at market
level. Hasthampatti reports 276 days overall but splits them across Deshi (39.5%) and
Local (36.4%) — neither variety alone qualifies.

- `UNIQUE (market_id, commodity_id, variety, grade, price_date)` is correct and must
  not be relaxed. Collapsing variety to make the numbers look better would fabricate
  a continuity that no single tradeable series has.
- Any dispersion or spread computed across varieties is invalid. This belongs in a
  constraint or a documented view, not in reviewer memory.

## 3. `market` needs `aliases` from day one — 25.4% of the pull is duplicate listings

455 raw market names map to 275 real markets. AGMARKNET lists the same Uzhavar
Sandhai market twice on the same day as `X (Uzhavar Sandhai)` and
`X (Uzhavar Sandhai) APMC`; on shared days the prices are 99.9% identical.

- `market.aliases jsonb` is load-bearing, not cosmetic. The loader resolves raw names
  through it before insert.
- The unique key above is what actually stops the double-count from reaching the
  engine. Without alias resolution *and* the unique key, one market would appear to
  disagree with itself and produce fake arbitrage.
- Unmapped names must be **rejected and logged**, never inserted under a guessed
  canonical name.

## 4. `market_type` is a required column, not a name suffix

The schema in STAGE0 has no `market_type` on `market`. It needs one:
`UZHAVAR_SANDHAI | APMC`. Uzhavar Sandhai are retail farmers' markets; APMC are
wholesale. Their price levels are not comparable, and mixing them in any spread
calculation produces a margin that does not exist. Deriving this from the name string
at query time is how that mistake gets made — store it.

## 5. Price storage

Source is INR/quintal, integers. Both raw and normalized are preserved
(`raw_price_value` + `raw_price_unit` alongside `*_inr_per_kg`), so a wrong
conversion factor stays recoverable without re-fetching. Measured implausible rate
after conversion is 0.85% dataset-wide, 0.00% on the selected series — consistent
with a uniform quintal source and no mixed units.

## 6. Usable history starts 2024-07-16, not 2005

The archive's 2005–2013 tail is 87–193 rows/year with a total gap from 2014 to 2023.
Any backtest window, retention policy, or "earliest date" default must use
**2024-07-16**. A naive `MIN(price_date)` returns 2005-08-22 and would imply 20 years
of history that does not exist.

## 7. Oddanchatram is missing entirely

Zero rows under any spelling — the major tomato APMC in Dindigul district. The
schema is unaffected, but any market list seeded as "the important TN tomato markets"
will silently omit it. Seed from the measured market list, not from a recalled one.
