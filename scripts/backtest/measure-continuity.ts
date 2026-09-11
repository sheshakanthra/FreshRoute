/**
 * One-off measurement: which (market, variety) series have the most
 * complete daily coverage over the real 26-month window, so the backtest
 * picks markets by measured continuity, not assumption.
 */
import * as fs from "node:fs";
import * as path from "node:path";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}
loadEnv();

async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  const [{ min_date, max_date }] = await sql<{ min_date: string; max_date: string }[]>`
    select min(price_date)::text as min_date, max(price_date)::text as max_date from market_price
  `;
  console.log("full data window:", min_date, "to", max_date);

  // Continuity by (market, variety, market_type) — distinct reporting days,
  // restricted to UZHAVAR_SANDHAI (D0: retail, the vast majority of real
  // rows) so the comparison never crosses market_type.
  const rows = await sql<
    { market_id: string; market_name: string; variety: string; market_type: string; distinct_days: number; first_day: string; last_day: string }[]
  >`
    select
      mp.market_id,
      m.name as market_name,
      mp.variety,
      m.market_type,
      count(distinct mp.price_date)::int as distinct_days,
      min(mp.price_date)::text as first_day,
      max(mp.price_date)::text as last_day
    from market_price mp
    join market m on m.id = mp.market_id
    where m.market_type = 'UZHAVAR_SANDHAI'
    group by mp.market_id, m.name, mp.variety, m.market_type
    order by distinct_days desc
    limit 20
  `;
  console.log("\nTop 20 (market, variety) series by distinct reporting days (UZHAVAR_SANDHAI only):");
  for (const r of rows) {
    console.log(
      `  ${r.market_name.padEnd(35)} ${r.variety.padEnd(8)} days=${r.distinct_days} span=${r.first_day}..${r.last_day}`,
    );
  }

  // Also check: for the top market+variety, how many days have a gap of >1
  // (i.e., how "dense" is it, not just distinct count over a long span).
  const top = rows[0];
  if (top) {
    console.log(`\nGap analysis for top series: ${top.market_name} / ${top.variety}`);
    const days = await sql<{ price_date: string }[]>`
      select price_date::text from market_price
      where market_id = ${top.market_id} and variety = ${top.variety}
      order by price_date
    `;
    const dates = days.map((d) => new Date(d.price_date).getTime());
    let maxGapDays = 0;
    let totalGapDays = 0;
    for (let i = 1; i < dates.length; i++) {
      const gapDays = Math.round((dates[i] - dates[i - 1]) / 86400000);
      if (gapDays > 1) totalGapDays += gapDays - 1;
      maxGapDays = Math.max(maxGapDays, gapDays - 1);
    }
    const spanDays = Math.round((dates[dates.length - 1] - dates[0]) / 86400000) + 1;
    console.log(`  span_days=${spanDays} reporting_days=${dates.length} continuity=${((dates.length / spanDays) * 100).toFixed(1)}% max_gap=${maxGapDays}d total_missing=${totalGapDays}d`);
  }

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
