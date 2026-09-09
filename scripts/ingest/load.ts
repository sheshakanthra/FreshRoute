/**
 * D2 ingestion — stage 3: load.
 *
 * Idempotent upsert of normalized rows into market_price, keyed on the
 * table's own unique index (market_id, commodity_id, variety, grade,
 * price_date). Re-running with unchanged source data must insert 0 new
 * rows — verified here via Postgres's `xmax = 0` trick on the upsert's
 * RETURNING clause, which distinguishes a real INSERT from a no-op
 * ON CONFLICT UPDATE for each row, rather than just asserting idempotency.
 *
 * Writes exactly one ingestion_run row per invocation with real counts.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { commodity, ingestionRun, marketPrice } from "../../src/db/schema";
import type { NormalizedRow } from "./normalize";

const PROJ_ROOT = path.resolve(__dirname, "../..");
const NORM_FILE = path.join(PROJ_ROOT, "data", "ingest", "normalized", "tomato_tn.ndjson");
const NORM_SUMMARY_FILE = path.join(PROJ_ROOT, "data", "ingest", "normalized", "_summary.json");
const CHUNK_SIZE = 500;

/** Reads the rejected-row count straight from normalize.ts's own summary,
 * so load.ts doesn't rely on a caller to pass it correctly by hand. */
function readUpstreamRejectedCount(): number {
  if (!fs.existsSync(NORM_SUMMARY_FILE)) return 0;
  try {
    const s = JSON.parse(fs.readFileSync(NORM_SUMMARY_FILE, "utf8"));
    return typeof s.rejected === "number" ? s.rejected : 0;
  } catch {
    return 0;
  }
}

function loadEnv() {
  const envPath = path.join(PROJ_ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

async function readNdjson(filePath: string): Promise<NormalizedRow[]> {
  const rows: NormalizedRow[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) rows.push(JSON.parse(line));
  }
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface LoadSummary {
  rowsFetched: number; // rows presented to the loader (normalized input)
  rowsInserted: number; // genuinely new rows (xmax = 0 on the upsert)
  rowsUpdated: number; // rows that matched the unique key and were updated
  rowsRejectedUpstream: number; // rejected during normalize, carried through for the ingestion_run total
  ingestionRunId: string;
}

export async function runLoad(rejectedUpstream?: number): Promise<LoadSummary> {
  const rejectedCount = rejectedUpstream ?? readUpstreamRejectedCount();
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, client } = createDb(url);

  try {
    if (!fs.existsSync(NORM_FILE)) throw new Error(`normalized file not found: ${NORM_FILE} — run normalize.ts first`);

    const commodityRow = await db.select({ id: commodity.id }).from(commodity).where(eq(commodity.code, "TOMATO")).limit(1);
    if (commodityRow.length === 0) throw new Error("commodity TOMATO not found — run scripts/db/seed.ts first");
    const commodityId = commodityRow[0].id;

    const rows = await readNdjson(NORM_FILE);
    console.log(`[load] read ${rows.length} normalized rows from ${NORM_FILE}`);

    const [{ id: runId }] = await db
      .insert(ingestionRun)
      .values({ source: "data.gov.in:35985678-0d79-46b4-9ed6-6f13308a1d24", status: "RUNNING", rowsFetched: rows.length })
      .returning({ id: ingestionRun.id });

    let inserted = 0;
    let updated = 0;
    const chunks = chunk(rows, CHUNK_SIZE);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const values = chunks[i].map((r) => ({
          marketId: r.marketId,
          commodityId,
          variety: r.variety,
          grade: r.grade,
          priceDate: r.priceDate,
          minPriceInrPerKg: r.minPriceInrPerKg !== null ? String(r.minPriceInrPerKg) : null,
          maxPriceInrPerKg: r.maxPriceInrPerKg !== null ? String(r.maxPriceInrPerKg) : null,
          modalPriceInrPerKg: String(r.modalPriceInrPerKg),
          rawPriceValue: r.rawPriceValue !== null ? String(r.rawPriceValue) : null,
          rawPriceUnit: r.rawPriceUnit,
          demandSource: r.demandSource,
          isDuplicateListing: r.isDuplicateListing,
          duplicateSourceCount: r.duplicateSourceCount,
          source: r.source,
          sourceUrl: r.sourceUrl,
          fetchedAt: new Date(r.fetchedAt),
          license: r.license,
          rawRowHash: r.rawRowHash,
        }));

        const result = await db
          .insert(marketPrice)
          .values(values)
          .onConflictDoUpdate({
            target: [marketPrice.marketId, marketPrice.commodityId, marketPrice.variety, marketPrice.grade, marketPrice.priceDate],
            set: {
              minPriceInrPerKg: sql`excluded.min_price_inr_per_kg`,
              maxPriceInrPerKg: sql`excluded.max_price_inr_per_kg`,
              modalPriceInrPerKg: sql`excluded.modal_price_inr_per_kg`,
              rawPriceValue: sql`excluded.raw_price_value`,
              rawPriceUnit: sql`excluded.raw_price_unit`,
              demandSource: sql`excluded.demand_source`,
              isDuplicateListing: sql`excluded.is_duplicate_listing`,
              duplicateSourceCount: sql`excluded.duplicate_source_count`,
              source: sql`excluded.source`,
              sourceUrl: sql`excluded.source_url`,
              fetchedAt: sql`excluded.fetched_at`,
              license: sql`excluded.license`,
              rawRowHash: sql`excluded.raw_row_hash`,
            },
          })
          // xmax = 0 identifies rows that were genuinely INSERTed by this
          // statement, as opposed to ones that hit the ON CONFLICT branch.
          .returning({ wasInsert: sql<boolean>`(xmax = 0)` });

        const insertedInChunk = result.filter((r) => r.wasInsert).length;
        inserted += insertedInChunk;
        updated += result.length - insertedInChunk;

        if ((i + 1) % 20 === 0 || i === chunks.length - 1) {
          console.log(`[load] chunk ${i + 1}/${chunks.length} — inserted so far: ${inserted}, updated so far: ${updated}`);
        }
      }

      await db
        .update(ingestionRun)
        .set({
          status: "SUCCESS",
          finishedAt: new Date(),
          rowsInserted: inserted,
          rowsRejected: rejectedCount,
        })
        .where(eq(ingestionRun.id, runId));
    } catch (err) {
      await db
        .update(ingestionRun)
        .set({ status: "FAILED", finishedAt: new Date(), rowsInserted: inserted, rowsRejected: rejectedCount, errorSummary: String(err).slice(0, 2000) })
        .where(eq(ingestionRun.id, runId));
      throw err;
    }

    const summary: LoadSummary = {
      rowsFetched: rows.length,
      rowsInserted: inserted,
      rowsUpdated: updated,
      rowsRejectedUpstream: rejectedCount,
      ingestionRunId: runId,
    };
    console.log(
      `[load] DONE — presented=${summary.rowsFetched} inserted=${summary.rowsInserted} updated=${summary.rowsUpdated} ` +
        `rejected_upstream=${summary.rowsRejectedUpstream} ingestion_run=${summary.ingestionRunId}`,
    );
    return summary;
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  // Optional explicit override; normally omitted — reads normalize.ts's own
  // _summary.json automatically (see readUpstreamRejectedCount above).
  const rejectedArg = process.argv[2] !== undefined ? Number(process.argv[2]) : undefined;
  runLoad(rejectedArg !== undefined && Number.isFinite(rejectedArg) ? rejectedArg : undefined).catch((err) => {
    console.error("[load] FATAL:", err);
    process.exit(1);
  });
}
