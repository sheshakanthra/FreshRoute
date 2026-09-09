/** D1 gate verification — queries the live DB directly, doesn't trust CLI output. */
import * as fs from "node:fs";
import * as path from "node:path";
import postgres from "postgres";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`;
    console.log(`\n=== TABLES (${tables.length}) ===`);
    tables.forEach((t) => console.log(" ", t.table_name));

    const enums = await sql`
      select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t join pg_enum e on t.oid = e.enumtypid
      group by t.typname order by t.typname`;
    console.log(`\n=== ENUMS (${enums.length}) ===`);
    enums.forEach((e) => console.log(`  ${e.typname}: ${e.labels.join(", ")}`));

    const fks = await sql`
      select conname, conrelid::regclass as table_, confrelid::regclass as ref_table, confdeltype
      from pg_constraint where contype = 'f' order by conrelid::regclass::text`;
    console.log(`\n=== FOREIGN KEYS (${fks.length}) ===`);

    const uniques = await sql`
      select indexname, tablename from pg_indexes
      where schemaname='public' and indexdef ilike '%unique%' order by tablename`;
    console.log(`\n=== UNIQUE INDEXES (${uniques.length}) ===`);
    uniques.forEach((u) => console.log(`  ${u.tablename}.${u.indexname}`));

    const triggers = await sql`
      select event_object_table, trigger_name, event_manipulation
      from information_schema.triggers where trigger_schema='public'
      order by event_object_table, trigger_name`;
    console.log(`\n=== TRIGGERS (${triggers.length}) ===`);
    triggers.forEach((t) => console.log(`  ${t.event_object_table}.${t.trigger_name} (${t.event_manipulation})`));

    // Prove the append-only trigger actually works. Runs entirely inside a
    // transaction that always rolls back (ROLLBACK_SENTINEL below), so this
    // is self-cleaning: no residue in organization/batch/batch_telemetry
    // regardless of how many times verify.ts is re-run.
    console.log("\n=== APPEND-ONLY ENFORCEMENT TEST (self-cleaning, always rolled back) ===");
    const commodityRow = await sql`select id from commodity where code = 'TOMATO' limit 1`;
    if (commodityRow.length === 0) {
      console.log("  SKIPPED (commodity not seeded yet — run db:seed first)");
    } else {
      const ROLLBACK_SENTINEL = Symbol("rollback");
      const result: { updateBlocked: boolean; deleteBlocked: boolean; cascadeDeleteBlocked: boolean } = {
        updateBlocked: false, deleteBlocked: false, cascadeDeleteBlocked: false,
      };
      try {
        await sql.begin(async (tx) => {
          const orgIns = await tx`insert into organization (name, type) values ('__verify_temp_org__', 'FPO') returning id`;
          const orgId = orgIns[0].id;
          const batchIns = await tx`
            insert into batch (org_id, commodity_id, quantity_kg)
            values (${orgId}, ${commodityRow[0].id}, 100)
            returning id`;
          const batchId = batchIns[0].id;
          const tIns = await tx`
            insert into batch_telemetry (batch_id, org_id, recorded_at, temperature_c, data_source, dedupe_key)
            values (${batchId}, ${orgId}, now(), 22.5, 'OBSERVED', ${"verify-" + Date.now()})
            returning id`;
          const telemetryId = tIns[0].id;

          // Each risky statement runs inside its own SAVEPOINT: a trigger
          // exception aborts the current (sub-)transaction, and without a
          // savepoint that would poison every statement after it for the
          // rest of the outer transaction, not just the one being tested.
          try {
            await tx.savepoint(async (sp) => {
              await sp`update batch_telemetry set temperature_c = 99 where id = ${telemetryId}`;
            });
          } catch (e: any) {
            result.updateBlocked = /append-only/i.test(String(e.message));
            if (!result.updateBlocked) throw e; // unexpected error — surface it
          }
          try {
            await tx.savepoint(async (sp) => {
              await sp`delete from batch_telemetry where id = ${telemetryId}`;
            });
          } catch (e: any) {
            result.deleteBlocked = /append-only/i.test(String(e.message));
            if (!result.deleteBlocked) throw e;
          }
          try {
            await tx.savepoint(async (sp) => {
              await sp`delete from batch where id = ${batchId}`;
            });
          } catch (e: any) {
            result.cascadeDeleteBlocked = /append-only/i.test(String(e.message));
            if (!result.cascadeDeleteBlocked) throw e;
          }
          throw ROLLBACK_SENTINEL; // always undo the inserts above
        });
      } catch (e) {
        if (e !== ROLLBACK_SENTINEL) throw e;
      }
      console.log(`  UPDATE blocked: ${result.updateBlocked}`);
      console.log(`  DELETE blocked: ${result.deleteBlocked}`);
      console.log(`  Cascade delete of parent batch also blocked by trigger: ${result.cascadeDeleteBlocked}`);
      console.log("  (transaction rolled back — zero residue left in the database)");
    }

    console.log("\n=== ROW COUNTS ===");
    const counts = await sql`
      select 'organization' t, count(*)::int c from organization
      union all select 'commodity', count(*)::int from commodity
      union all select 'action_type', count(*)::int from action_type
      union all select 'market', count(*)::int from market
      union all select 'market_alias', count(*)::int from market_alias
      union all select 'market_price', count(*)::int from market_price
      union all select 'batch', count(*)::int from batch
      union all select 'batch_telemetry', count(*)::int from batch_telemetry
      order by t`;
    counts.forEach((c) => console.log(`  ${c.t}: ${c.c}`));

    console.log("\n=== journal / drizzle migrations table ===");
    const j = await sql`select * from drizzle.__drizzle_migrations order by id`;
    j.forEach((r: any) => console.log(" ", r));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e);
  process.exit(1);
});
