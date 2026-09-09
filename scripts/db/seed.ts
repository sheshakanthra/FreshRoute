/**
 * D1 seed — reference/dimension data only. No market_price rows: those are
 * facts loaded by D2's ingestion pipeline from the raw pull, not seeded here.
 *
 * Idempotent: safe to re-run. Uses upsert-by-natural-key everywhere a
 * natural key exists (commodity.code, action_type.code, market_alias.raw_name)
 * and a name+district lookup for market (which has no natural external code
 * from the source).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { eq, and } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import {
  organization,
  commodity,
  actionType,
  market,
  marketAlias,
} from "../../src/db/schema";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

type MarketRow = {
  rawName: string;
  canonical: string;
  marketType: "APMC" | "UZHAVAR_SANDHAI" | "OTHER";
  district: string;
  mappingNote: string;
};

/** Minimal CSV parser sufficient for this checked-in file (quoted fields, no embedded newlines). */
function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (c === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += c;
    }
    out.push(cur);
    return out;
  });
}

function loadMarketLookup(): MarketRow[] {
  const csvPath = path.resolve(
    __dirname,
    "../../data/validation/lookup/markets_tn.csv"
  );
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...body] = rows;
  const idx = {
    raw: header.indexOf("market_name_raw"),
    canon: header.indexOf("market_canonical"),
    type: header.indexOf("market_type"),
    district: header.indexOf("district"),
    note: header.indexOf("mapping_note"),
  };
  return body
    .filter((r) => r.length >= header.length && r[idx.raw])
    .map((r) => ({
      rawName: r[idx.raw],
      canonical: r[idx.canon],
      marketType: (r[idx.type] as MarketRow["marketType"]) || "OTHER",
      district: r[idx.district],
      mappingNote: r[idx.note] ?? "",
    }));
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, client } = createDb(url);

  try {
    // -----------------------------------------------------------------
    // 1. Bootstrap organization — batch/recommendation/outcome_record all
    //    require org_id NOT NULL from the first migration. Seeding one
    //    dev/demo org here satisfies that FK for D2/D3 testing; real
    //    multi-org onboarding is an auth-layer concern for later.
    // -----------------------------------------------------------------
    const existingOrg = await db.select().from(organization).limit(1);
    if (existingOrg.length === 0) {
      await db.insert(organization).values({
        name: "FreshRoute Demo Collective",
        type: "COLLECTION_CENTRE",
      });
      console.log("seeded 1 bootstrap organization");
    } else {
      console.log("organization already seeded, skipping");
    }

    // -----------------------------------------------------------------
    // 2. Commodity: tomato.
    //
    // Postharvest physiology constants are cited; the two decay-model
    // parameters (quality floors, base_decay_points_per_hour) are
    // engineering estimates derived FROM that literature, not lab-measured
    // figures, and are labelled as such rather than given false precision.
    //
    // Sources:
    //  - USDA Agricultural Handbook 66, "The Commercial Storage of Fruits,
    //    Vegetables, and Florist and Nursery Stocks" — tomato entry:
    //    climacteric; mature-green storage optimum 12.5-15°C, 90-95% RH;
    //    chilling injury below ~10°C for ripening/ripe fruit.
    //  - Kader, A.A. (ed.), "Postharvest Technology of Horticultural
    //    Crops," UC ANR Publication 3311 — Q10 for tomato respiration in
    //    the postharvest handling range is commonly cited around 2.0-3.0;
    //    2.5 used here as the representative midpoint.
    // -----------------------------------------------------------------
    await db
      .insert(commodity)
      .values({
        code: "TOMATO",
        name: "Tomato",
        climacteric: true,
        // Judgment call, not a literature constant: fraction of full
        // quality (0-1) below which a batch is no longer sellable fresh /
        // no longer acceptable to a processor. Calibrated loosely against
        // typical market-grade cutoffs, not measured.
        qualityFloorFresh: "0.55",
        qualityFloorProcess: "0.30",
        optimalTempC: "13.00",
        chillingThresholdC: "10.00",
        optimalHumidityMin: "90.00",
        optimalHumidityMax: "95.00",
        q10: "2.50",
        // Derived estimate, not measured: ambient (~20°C) shelf life to
        // unsaleable is commonly quoted around 7-10 days for ripe tomato;
        // 100 quality points over ~200 hours ≈ 0.5 points/hour at that
        // reference temperature. The engine's actual decay model (D1 does
        // not touch it) may scale this by Q10 and temperature deviation.
        baseDecayPointsPerHour: "0.500",
        notes:
          "TN tomato varieties observed in D0 (data.gov.in AGMARKNET archive): " +
          "Deshi, Local, Other, Hybrid. Params above are postharvest-physiology " +
          "literature (USDA AH66, Kader UC ANR 3311) for temperature/humidity/" +
          "chilling/Q10; quality floors and base_decay_points_per_hour are " +
          "engineering estimates derived from typical shelf-life figures, not " +
          "lab-measured constants — flagged here rather than given false precision.",
      })
      .onConflictDoNothing({ target: commodity.code });
    console.log("seeded commodity: TOMATO (upsert-safe)");

    // -----------------------------------------------------------------
    // 3. action_type — the six recovery pathways, per STAGE0.
    // -----------------------------------------------------------------
    const actionTypes = [
      { code: "SELL", name: "Sell", description: "Sell at the planned/current market.", evidenceTier: "VERIFIED" as const },
      { code: "DISCOUNT", name: "Discount", description: "Sell at a reduced price to move inventory faster.", evidenceTier: "VERIFIED" as const },
      { code: "DIVERT", name: "Divert", description: "Redirect to a nearby secondary buyer.", evidenceTier: "VERIFIED" as const },
      { code: "REROUTE", name: "Reroute", description: "Redirect the consignment mid-transit to a different market.", evidenceTier: "PLAUSIBLE_UNVERIFIED" as const },
      { code: "STORE", name: "Store", description: "Hold in cold storage for a later sale window.", evidenceTier: "PLAUSIBLE_UNVERIFIED" as const },
      { code: "PROCESS", name: "Process", description: "Sell into a processing off-take channel.", evidenceTier: "PLAUSIBLE_UNVERIFIED" as const },
    ];
    for (const a of actionTypes) {
      await db.insert(actionType).values(a).onConflictDoNothing({ target: actionType.code });
    }
    console.log(`seeded ${actionTypes.length} action_type rows (upsert-safe)`);

    // -----------------------------------------------------------------
    // 4. Markets + aliases, from the D0 checked-in lookup table:
    //    data/validation/lookup/markets_tn.csv (455 raw -> 275 canonical,
    //    measured — not fabricated).
    // -----------------------------------------------------------------
    const lookupRows = loadMarketLookup();
    const canonicalKeys = new Map<string, { name: string; district: string; marketType: MarketRow["marketType"] }>();
    for (const r of lookupRows) {
      const key = `${r.canonical}|${r.district}`;
      if (!canonicalKeys.has(key)) {
        canonicalKeys.set(key, { name: r.canonical, district: r.district, marketType: r.marketType });
      }
    }

    let marketsInserted = 0;
    let marketsExisting = 0;
    const marketIdByKey = new Map<string, string>();
    for (const [key, m] of canonicalKeys) {
      const existing = await db
        .select({ id: market.id })
        .from(market)
        .where(and(eq(market.name, m.name), eq(market.district, m.district)))
        .limit(1);
      if (existing.length > 0) {
        marketIdByKey.set(key, existing[0].id);
        marketsExisting++;
        continue;
      }
      const inserted = await db
        .insert(market)
        .values({
          name: m.name,
          district: m.district,
          state: "Tamil Nadu",
          marketType: m.marketType,
          aliases: [],
        })
        .returning({ id: market.id });
      marketIdByKey.set(key, inserted[0].id);
      marketsInserted++;
    }
    console.log(
      `markets: ${marketsInserted} inserted, ${marketsExisting} already present (${canonicalKeys.size} canonical total)`
    );

    let aliasesInserted = 0;
    let aliasesExisting = 0;
    let aliasesRejected = 0;
    for (const r of lookupRows) {
      const key = `${r.canonical}|${r.district}`;
      const marketId = marketIdByKey.get(key);
      if (!marketId) {
        // Never guess a canonical id — log and skip rather than insert
        // a wrong mapping.
        aliasesRejected++;
        console.warn(`  REJECTED alias (no resolved market): raw="${r.rawName}" canonical="${r.canonical}" district="${r.district}"`);
        continue;
      }
      const existingAlias = await db
        .select({ id: marketAlias.id })
        .from(marketAlias)
        .where(eq(marketAlias.rawName, r.rawName))
        .limit(1);
      if (existingAlias.length > 0) {
        aliasesExisting++;
        continue;
      }
      await db.insert(marketAlias).values({
        rawName: r.rawName,
        marketCanonicalId: marketId,
        mappingNote: r.mappingNote,
        isDuplicateListing: r.mappingNote === "apmc_suffix_stripped_duplicate_listing",
        source: "data.gov.in",
        seededFrom: "data/validation/lookup/markets_tn.csv",
      });
      aliasesInserted++;
    }
    console.log(
      `market_alias: ${aliasesInserted} inserted, ${aliasesExisting} already present, ${aliasesRejected} rejected`
    );

    // Backfill the market.aliases convenience column from market_alias.
    for (const [key, marketId] of marketIdByKey) {
      const raws = lookupRows.filter((r) => `${r.canonical}|${r.district}` === key).map((r) => r.rawName);
      await db.update(market).set({ aliases: raws }).where(eq(market.id, marketId));
    }

    console.log("\nD1 seed complete.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
