/**
 * D2 ingestion — stage 1: fetch.
 *
 * Pulls TN + Tomato from the data.gov.in "Variety-wise Daily Market Prices"
 * archive resource (35985678-...) — NOT the snapshot resource
 * (9ef84268-...), whose arrival_date filter is broken and always returns
 * today's rows regardless of the filter value (measured in D0).
 *
 * This resource's date filter only matches an exact day, not a range, so
 * there is no server-side way to ask for "since 2024-07-16" directly.
 * Instead — same method D0 proved works — we walk the full State+Commodity
 * result set via offset pagination (unsorted by date; old rows and recent
 * rows are interleaved across pages) and let normalize.ts apply the window
 * cutoff. Raw pages therefore contain the full TN+Tomato history available
 * at the source (2005 onward, sparse before 2024-07), not just the window.
 *
 * Raw store design choice: unlike D0's one-shot, permanently-preserved pull
 * under data/validation/raw/ (never edited, historical record of the D0
 * verification), this is an operational pipeline meant to be re-run. Each
 * run's pages overwrite the previous run's in place under
 * data/ingest/raw/datagovin_variety_archive/ — this is "the current raw
 * pull," not an archive of every past pull. Each page's .meta.json still
 * records its own fetched_at, so staleness is always visible.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const PROJ_ROOT = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(PROJ_ROOT, "data", "ingest", "raw", "datagovin_variety_archive");

const RESOURCE_ID = "35985678-0d79-46b4-9ed6-6f13308a1d24";
const BASE_URL = "https://api.data.gov.in/resource/" + RESOURCE_ID;
const LICENSE = "Government Open Data License - India (GODL) https://data.gov.in/government-open-data-license-india";
const LIMIT = 5000;
const FILTERS = { "filters[State]": "Tamil Nadu", "filters[Commodity]": "Tomato" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function loadEnv() {
  const envPath = path.join(PROJ_ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

function buildUrl(apiKey: string, offset: number): string {
  const p = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(LIMIT),
    offset: String(offset),
    ...FILTERS,
  });
  return `${BASE_URL}?${p.toString()}`;
}

function redact(url: string, apiKey: string): string {
  return url.replace(apiKey, "<DATA_GOV_IN_API_KEY>");
}

async function fetchPage(apiKey: string, offset: number, attempt = 1): Promise<{ status: number; body: string; elapsedMs: number }> {
  const url = buildUrl(apiKey, offset);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", Connection: "close" },
      signal: AbortSignal.timeout(180_000),
    });
    const body = await res.text();
    return { status: res.status, body, elapsedMs: Date.now() - t0 };
  } catch (err) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      return fetchPage(apiKey, offset, attempt + 1);
    }
    throw err;
  }
}

export interface FetchSummary {
  pulledAtIso: string;
  pages: number;
  totalRowsFetched: number;
  reportedTotal: number | null;
  rawDir: string;
  failedAttempts: { offset: number; error: string }[];
}

export async function runFetch(): Promise<FetchSummary> {
  loadEnv();
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) throw new Error("DATA_GOV_IN_API_KEY is not set (checked process.env and .env)");

  fs.mkdirSync(RAW_DIR, { recursive: true });
  const pulledAtIso = new Date().toISOString();

  let offset = 0;
  let page = 0;
  let totalRows = 0;
  let reportedTotal: number | null = null;
  const failedAttempts: { offset: number; error: string }[] = [];

  console.log(`[fetch] resource=${RESOURCE_ID} filters=${JSON.stringify(FILTERS)} limit=${LIMIT}`);

  for (;;) {
    let status: number, body: string, elapsedMs: number;
    try {
      ({ status, body, elapsedMs } = await fetchPage(apiKey, offset));
    } catch (err) {
      failedAttempts.push({ offset, error: String(err) });
      console.error(`[fetch] page=${page} offset=${offset} FAILED after retries: ${err}`);
      break;
    }

    if (status !== 200) {
      failedAttempts.push({ offset, error: `http ${status}` });
      console.error(`[fetch] page=${page} offset=${offset} http=${status} — stopping`);
      break;
    }

    let json: any;
    try {
      json = JSON.parse(body);
    } catch (err) {
      failedAttempts.push({ offset, error: `bad json: ${err}` });
      console.error(`[fetch] page=${page} offset=${offset} JSON parse failed — stopping`);
      break;
    }

    const records: unknown[] = Array.isArray(json.records) ? json.records : [];
    if (reportedTotal === null && typeof json.total === "number") reportedTotal = json.total;

    const fileName = `page_${String(page).padStart(3, "0")}.json`;
    const filePath = path.join(RAW_DIR, fileName);
    fs.writeFileSync(filePath, body); // byte-for-byte as received

    const sha256 = crypto.createHash("sha256").update(body).digest("hex");
    const meta = {
      source: "data.gov.in",
      resource_id: RESOURCE_ID,
      resource_title: json.title ?? null,
      url: redact(buildUrl(apiKey, offset), apiKey),
      params: { limit: LIMIT, offset, format: "json", ...FILTERS },
      http_status: status,
      fetched_at: new Date().toISOString(),
      row_count: records.length,
      reported_total: json.total ?? null,
      sha256,
      bytes: Buffer.byteLength(body),
      elapsed_ms: elapsedMs,
      license: LICENSE,
      raw_file: fileName,
    };
    fs.writeFileSync(path.join(RAW_DIR, `page_${String(page).padStart(3, "0")}.meta.json`), JSON.stringify(meta, null, 2));

    totalRows += records.length;
    console.log(`[fetch] page=${page} offset=${offset} rows=${records.length} ${elapsedMs}ms sha=${sha256.slice(0, 12)}`);

    if (records.length < LIMIT) {
      console.log("[fetch] short page — end of set");
      break;
    }
    offset += LIMIT;
    page += 1;
  }

  const summary: FetchSummary = {
    pulledAtIso,
    pages: page + 1,
    totalRowsFetched: totalRows,
    reportedTotal,
    rawDir: RAW_DIR,
    failedAttempts,
  };
  fs.writeFileSync(path.join(RAW_DIR, "_manifest.json"), JSON.stringify(summary, null, 2));

  console.log(`[fetch] DONE — ${totalRows} rows across ${summary.pages} pages, ${failedAttempts.length} failed attempts`);
  return summary;
}

if (require.main === module) {
  runFetch().catch((err) => {
    console.error("[fetch] FATAL:", err);
    process.exit(1);
  });
}
