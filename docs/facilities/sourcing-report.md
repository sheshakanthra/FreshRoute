# Facility sourcing report — Tamil Nadu cold storage & processing

**Sourcing date: 2026-09-10.** Every URL below was fetched live on that date; none of
this is recalled from prior research. Commodity focus: tomato. Target tables:
`storage_facility`, `processing_facility` (both 0 rows before this work).

## Headline

| | |
|---|---|
| Sources checked | 6 |
| Accessible with real facility records | 3 |
| Accessible but policy/aggregate only | 1 |
| Login-walled | 1 |
| Dead link | 1 |
| **Facilities inserted (storage)** | **143** |
| **Facilities inserted (processing)** | **4** |
| Rows with a per-row source citation | 143 / 143 and 4 / 4 |
| Leads recorded but NOT inserted | see [unverified-leads.md](unverified-leads.md) |

The count is not zero. But read ["The result that actually
matters"](#the-result-that-actually-matters) before treating STORE/PROCESS as unblocked —
the facilities are real, and the economics that the engine scores on are still entirely
absent.

---

## 1. Sources checked

### 1.1 NHB (National Horticulture Board) — ACCESSIBLE, mixed quality

| Endpoint | Status | What it is |
|---|---|---|
| `https://nhb.gov.in/` | **Accessible**, footer dated 09 September 2026 | Live portal |
| `https://nhb.gov.in/IcapMap/ICAPMap_rpt.aspx` | **Accessible**, aggregate only | ICAP summary: national totals (6,111 projects / 22,739,954 MT). **No facility-level rows.** Self-declares its base survey is *"upto 2012-13 … as per the Survey got conducted by NHB in the year 2013."* |
| `https://www.nhb.gov.in/Handlers/GeoIndiaHandlerGis.ashx` | **Accessible — real dataset** | Undocumented CSV endpoint behind the ICAP map. 4,937 national rows: `NameofProject,latitude,longitude,StateName,DistrictName`. **64 Tamil Nadu rows.** → **USED** |
| `https://www.nhb.gov.in/doc/Tamilnadu.pdf` | **Accessible — real records, but rejected**, see 2.2 | State-wise NHB cold-storage subsidy sanctions, 1999-2000 → 2012-13. ~45 named units with address and capacity (MT). |

**Data-quality findings on the GIS layer (these are why it is only partly trusted):**

- Its `DistrictName` column is **demonstrably wrong** for at least 6 of the 64 TN rows.
  `TANFED COLD STORAGE BASIN BRIDGE` (13.10, 80.25 — Basin Bridge is in Chennai),
  `ARUNACHALA COLD STORAGE PVT LTD` (13.15, 80.22), `SUN SHEN COLD STORAGE LTD`,
  `OM SHAKTHI COLD CHAIN`, `EM PEE BEE EXPORTS` and a second TANFED row are all
  Chennai-belt coordinates **labelled "Theni"** (Theni is ~9.9 N, 77.5 E — roughly 350 km away).
- The national file contains at least one **impossible coordinate**: `RKS FUTURE FOODS AND
  COLD CHAIN PVT LTD` at latitude **90.9393** (Himachal Pradesh row).
- The `NameofProject` field is **truncated at 50 characters**
  (`…MILK PRODUCERS UNIO`, `…COOPERAT MILK PRODUCES UNION L`).
- One row is not a facility at all: **`APEIDA`** — an apparent misspelling of APEDA, an
  agency, carrying coordinates as though it were a cold store.

Consequences, applied: all 64 TN coordinates were validated against a Tamil Nadu bounding
box (8.0–13.7 N, 76.1–80.4 E) — all 64 pass. The **district column was rejected wholesale**
and those rows are stored with `district = NULL` rather than a guess. Only rows explicitly
named as cold storage/cold chain/cold store were taken (**32 of 64**); the remaining 32 are
dairy-union, marine/seafood-export and unnamed entries, plus the `APEIDA` junk row.

### 1.2 NCCD (National Centre for Cold-chain Development) — **LOGIN-WALLED**

- `https://nccd.gov.in/` — **live and modern** (React SPA, actively maintained, not a stale
  government page). Every path returns the SPA shell.
- Its backend is a **public GraphQL endpoint at `https://nccd.gov.in/graphql` with
  introspection enabled.** The schema is genuinely rich and is exactly what this project
  would want: `Facility` carries `name`, `capacity`, `pricePerTonnePerDay`,
  `minTemperature`/`maxTemperature`, `minHumidity`/`maxHumidity`, `commodities`, `address`,
  `establishedOn`, `status`.
- **But the facility data is authenticated-only:**
  - `getFacilities` → `{"errors":[{"message":"Not Authenticated","extensions":{"code":"UNAUTHENTICATED"}}]}`
  - `getStates` → returns `[]` unauthenticated.
  - `searchFacilities` — the public booking search — returns `[]`, and its return type
    `FacilitySearchResult` has **no `name` field at all** and exposes only a
    **`MaskedAddress`**. Facility identity is deliberately withheld until login.
  - `getCommodities` *is* public and does return a real commodity list.

**Yield: zero usable facility records.** This is the single highest-value source found —
it is the only one that publishes cold-storage *tariffs and temperatures* — and it needs an
account. **Recommended next step: register.**

### 1.3 MoFPI / PMKSY — **ACCESSIBLE and genuinely current**

- `https://www.mofpi.gov.in/en/Schemes/cold-chain` — accessible; links to the project list.
- `https://www.mofpi.gov.in/sites/default/files/consolidated_list_for_website_updation_as_on_30.06.2026_1.pdf`
  — **accessible, 29 pages, explicitly "As on 30.06.2026"** — i.e. ~2 months old at
  sourcing date. This is the only source found that is actually current.
- Content: *Consolidated List of State-Wise 409 Approved Cold Chain Projects*, with
  promoter name, sector, district, state, approval date, project cost, grant, and
  **physical progress (Completed / Ongoing)**.
- **Tamil Nadu: 26 projects — 15 completed, 11 ongoing.** → **USED** (F&V subset)

Sector split for TN: Dairy 9, Meat 3, Marine & Fishery 2, Poultry 2, Irradiation 2,
RTE/RTC 2, **F&V 4**. Only the 4 F&V projects are plausibly tomato-relevant, and all 4 are
marked *Completed*.

### 1.4 Tamil Nadu state — Dept of Agricultural Marketing & Agri Business — **ACCESSIBLE, best yield**

- `https://www.agrimark.tn.gov.in/index.php/Infra/cold_storage` — **accessible**, plain HTML
  table, **111 government cold storage units** with market-committee district, location,
  funding scheme, capacity (MT) and year of construction. → **USED (all 111)**
- Page states: 111 units / 13,565 MT under NADP, RIDF, APEDA, NABARD, NMSA, PART II & ABS;
  plus 3,908 MT in Primary Processing Centres and **54 MT of cold storage in Uzhavar
  Sandhais**; state total 17,527 MT.
- **No last-updated date on the page.** Construction years run 2007-08 → 2016. The page
  asserts in the present tense that the units *"are in use"* — that assertion is recorded
  in each row's `verification_note` and is *not* independently confirmed.

**Parse checksum:** the 111 extracted rows sum to **exactly 13,565 MT**, matching the
total the page states independently in prose. Two rows (s.no 59 and 60, both **Krishnagiri**
— an anchor district) initially failed extraction because of stray inline markup and were
recovered; the checksum is what proved the parse complete rather than plausible.

### 1.5 APEDA AgriExchange cold storage ready-reckoner — **DEAD LINK**

- `https://agriexchange.apeda.gov.in/Ready Reckoner/Cold_Storage/SouthernRegion/TAMILNADU.aspx`
  → **HTTP 404**. Appeared in search results as "COLD STORAGES IN TAMIL NADU" but the page
  no longer exists. No data taken.

### 1.6 Sources considered and not pursued

- TN Warehousing Policy 2026 — a **policy document**, not a facility directory.
- `tnagrisnet.tn.gov.in` — portal, no facility listing found.

---

## 2. What was verified vs rejected, and why

### 2.1 Accepted → inserted

| Group | Count | Source | Fields taken |
|---|---|---|---|
| TN regulated-market cold storages | **111** | TN Dept of Agricultural Marketing (1.4) | name (location + committee), district, capacity (MT → kg) |
| NHB ICAP GIS cold storages | **32** | NHB GIS layer (1.1) | name, lat, lon |
| PMKSY F&V cold-chain projects | **4** | MoFPI list, as on 30.06.2026 (1.3) | name, district |

The 4 processing rows: **ABC Fruits** (Krishnagiri), **Aachi Masala Foods Pvt. Ltd.**
(Thiruvallur → `Thiruvellore`), **Farm Fresh Banana** (Theni), **Frozen Fruits &
Vegetables** (Theni).

Note on the two Krishnagiri storage rows: they are **two distinct facilities at the same
location** (different scheme, capacity and year — PART II & ABS / 50 MT / 2009-10, and
NADP / 25 MT / 2012-13), per the source. They are not a duplicate.

### 2.2 Rejected → NOT inserted

**NHB `Tamilnadu.pdf` subsidy list (~45 named units with capacities) — rejected as a
machine-extractable source.** This is the one judgement call in this report worth
scrutinising, so the reasoning in full:

The PDF is real, primary, and its facility names are readable by eye. But its table wraps
every name/address cell across 2–4 physical lines while the numeric columns drift, and it
carries no `ToUnicode` map. Both extraction attempts produced **misattributed rows** —
capacity values landing against the wrong facility name (e.g. a parse that emitted
`"Raja Cold Storage" | 4111.28 MT` fused with three other units' addresses, and a
`-layout` pass that printed *"Satyam Food … Hanumangarh … Tamil Nadu"* — Hanumangarh is in
Rajasthan, a column that had drifted a full state over).

A facility name paired with **another facility's capacity** is a fabricated record even
though both halves came from a real government PDF. Since the brief forbids fabricated
facilities and accepts an empty result, this source was dropped rather than parsed at lower
confidence. Its ~45 names are in [unverified-leads.md](unverified-leads.md) for manual
transcription.

**Partial corroboration worth noting:** many names in that PDF *do* independently appear in
the live NHB GIS layer — KPS, Nilgiris, AKS, New Vennila, Raja, SBP, Poorna Vijaya Sai,
Western Farm Fresh, Arunachala, Sri Krishna, Vidya Bharathi, Ranga Lalitha, Sri Ayyappa,
Kolar, Annapoorani. Two independent NHB artifacts agreeing on a name is good evidence those
facilities are real, which is why the GIS versions (name + coordinates) were inserted.
Their **capacities were still left NULL** — corroborating a *name* across two sources does
not license importing a *number* from the parse that was rejected.

**Other rejections:** 32 NHB GIS rows not named as cold storage (dairy unions, seafood
exporters, the `APEIDA` non-facility); all NHB GIS district labels; the 22 non-F&V TN
PMKSY projects (dairy/meat/poultry/marine/irradiation — no stated relevance to tomato).

---

## 3. Cross-reference against districts we hold price data for

Our `market` table has **275 canonical markets across 37 districts**; `market_price` holds
115,538 rows. `market.lat`/`lon` are **entirely NULL (0 of 275)**, so this cross-reference
is **by district name only** — no proximity/radius analysis was possible.

District spellings were normalised onto our canonical `market.district` values
(`Thiruppur`→`Thirupur`, `Trichy`/`Tirucharipalli`→`Thiruchirappalli`,
`Thiruvallur`→`Thiruvellore`, `Thoothukudi`→`Tuticorin`,
`Kanyakumari`→`Nagercoil (Kannyiakumari)`, `Sivagangai`→`Sivaganga`, etc.).

**Result: all 111 state facilities and all 4 processing facilities fall in districts where
we have real market price data. Zero fall outside coverage** — so the "flag, don't drop"
rule for out-of-coverage facilities was never triggered.

- `in_covered_district = true` → **115** rows
- `in_covered_district = NULL` → **32** rows (the NHB GIS set — district unknowable, see 1.1)

Storage spans 22 districts. On the two backtest anchors specifically:

- **Krishnagiri** — 2 units at Krishnagiri town itself (50 MT + 25 MT), recorded under the
  *Dharmapuri* market committee (a pre-bifurcation administrative parent). The wider
  Dharmapuri committee has 10 units including Hosur, Palacode and Uthangarai.
- **Kumbakonam** — **no government cold storage at Kumbakonam itself.** Thanjavur district
  has only 2 units, at *Thanjavur* (25 MT) and *Valappakudi* (100 MT). The nearest private
  lead is `M/s Annapoorani Cold Storage Pvt. Ltd, Kumbakonam Tk` — which is corroborated
  across two NHB artifacts but has no verified capacity, so it sits in
  [unverified-leads.md](unverified-leads.md), not in the DB. For our
  strongest-continuity market, STORE currently has no co-located verified facility.

One caveat to carry forward: the state source's committee districts use **pre-bifurcation
names** — Krishnagiri sits under "Dharmapuri", Thoothukudi under "Thirunelveli". The
committee label is preserved verbatim in each row's `verification_note` so the mapping stays
auditable.

---

## 4. The result that actually matters

**143 storage and 4 processing rows now exist, so STORE and PROCESS are no longer
*structurally* infeasible. They are still not *evaluable*, and inserting these rows did not
change that.**

Checked directly against the DB after the migration:

| Column the engine needs | Rows populated |
|---|---|
| `storage_facility.capacity_kg` | 111 / 143 |
| `storage_facility.cost_per_kg_per_day` | **0 / 143** |
| `storage_facility.max_storage_days` | **0 / 143** |
| `storage_facility.storage_temp_c` / `storage_humidity_pct` | **0 / 143** |
| `processing_facility.gate_price_per_kg` | **0 / 4** |
| `processing_facility.yield_ratio` | **0 / 4** |
| `processing_facility.daily_capacity_kg` / `product_form` | **0 / 4** |

**Not one accessible directory publishes storage tariffs, holding temperatures, maximum
storage duration, processor gate prices or yield ratios.** Government directories answer
*"does a facility exist and where"*; they do not answer *"what does it cost to put 500 kg of
tomato in it for six days, and what will a processor pay at the gate"* — which is the entire
economic question STORE and PROCESS have to score. Those columns are deliberately NULL, not
estimated. Filling them with plausible-looking numbers would produce a working demo built on
invented economics, which is the specific failure mode the brief rules out.

**Also unresolved: nothing here is tomato-specific.** The 111 state units are generic
farmer-produce cold storage; the 4 PMKSY projects state sector `F&V`, not tomato. No
accessible source stated tomato suitability for any facility, and none was inferred.

### The realistic path to usable facility data

1. **Register on NCCD** (`nccd.gov.in`). Highest leverage by a wide margin: its GraphQL
   schema already exposes `pricePerTonnePerDay`, `minTemperature`/`maxTemperature`,
   `minHumidity`/`maxHumidity`, `capacity` and per-facility `commodities` — precisely the
   missing columns, structured, behind nothing worse than an account. Everything below is a
   fallback if registration fails.
2. **Phone the district agriculture / regulated-market offices** for the anchor districts
   (Krishnagiri, Thanjavur/Kumbakonam, Dharmapuri, Coimbatore). The 111 state units are
   *government market-committee* facilities, so the committee sets and publishes the tariff
   — this is a phone call and probably a per-district rate card, not a dataset hunt. It is
   also the only way to confirm which of these 2007–2016 units are still operating.
3. **Contact the 4 PMKSY F&V processors directly** for gate price, yield and whether they
   take tomato. `ABC Fruits` (Krishnagiri) is the obvious first call: F&V sector, Completed,
   Rs 28.59 crore project, and sitting in one of the two strongest-continuity markets in the
   backtest.
4. **Manually transcribe the NHB `Tamilnadu.pdf`** (~45 private units with capacities) if
   private cold storage matters. Needs a human reading the PDF — see 2.2 for why it should
   not be parsed automatically.

Until step 1 or 2 lands, STORE and PROCESS can be *presented* with real named facilities in
the right districts, but any cost or yield figure attached to them would be invented.

---

## 5. Artifacts

- Migration: `drizzle/0005_verified_facilities.sql` — adds provenance columns
  (`district`, `source_name`, `source_url`, `source_accessed_on`, `verification_note`,
  `in_covered_district`) to both tables, then inserts 143 + 4 rows. Every row carries its
  directory, URL and access date; **0 rows have a NULL `source_url`**.
- Schema: `src/db/schema/facilities.ts` updated to match. No engine or scoring code touched.
- Leads not inserted: `docs/facilities/unverified-leads.md`.
