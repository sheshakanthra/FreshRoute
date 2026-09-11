import "server-only";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db";
import { market, marketAlias, marketPrice } from "@/db/schema";

export async function getMarket(id: string) {
  const rows = await db.select().from(market).where(eq(market.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Markets that actually carry price data for a commodity, ordered by how
 * much data backs them (most-reported first) — a reasonable proxy for "a
 * market worth offering in a picker" given there's no other quality signal.
 */
export async function listMarketsWithPriceData(commodityId: string, limit = 50) {
  const rows = await db
    .select({
      id: market.id,
      name: market.name,
      district: market.district,
      state: market.state,
      marketType: market.marketType,
      rowCount: sql<number>`count(${marketPrice.id})`.mapWith(Number),
    })
    .from(market)
    .innerJoin(marketPrice, eq(marketPrice.marketId, market.id))
    .where(eq(marketPrice.commodityId, commodityId))
    .groupBy(market.id)
    .orderBy(desc(sql`count(${marketPrice.id})`))
    .limit(limit);
  return rows;
}

/**
 * Resolves a raw source-style market name to its canonical market row via
 * market_alias first (exact, authoritative), falling back to a fuzzy
 * case-insensitive substring match on the canonical name for callers (like
 * D3's mock-data migration) that don't have an exact raw AGMARKNET label to
 * key off. Never guesses past that — returns null rather than picking an
 * arbitrary market when nothing matches.
 */
export async function findMarketByNameFuzzy(nameHint: string) {
  const exact = await db
    .select({ market })
    .from(marketAlias)
    .innerJoin(market, eq(market.id, marketAlias.marketCanonicalId))
    .where(eq(marketAlias.rawName, nameHint))
    .limit(1);
  if (exact[0]) return exact[0].market;

  const fuzzy = await db
    .select()
    .from(market)
    .where(ilike(market.name, `%${nameHint}%`))
    .limit(1);
  return fuzzy[0] ?? null;
}

export async function listAlternateMarkets(commodityId: string, excludeMarketId: string, limit = 5) {
  const rows = await listMarketsWithPriceData(commodityId, limit + 1);
  return rows.filter((m) => m.id !== excludeMarketId).slice(0, limit);
}
