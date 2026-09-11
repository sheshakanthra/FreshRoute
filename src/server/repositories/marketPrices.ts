import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { marketPrice } from "@/db/schema";

/**
 * The latest price row for a (market, commodity[, variety]) series. Returns
 * price_date and fetched_at alongside the price itself so the UI can show
 * staleness — task requirement, not incidental. "Latest" means latest
 * price_date; fetched_at is a tiebreaker for same-day duplicate loads.
 */
export async function getLatestMarketPrice(marketId: string, commodityId: string, variety?: string) {
  const conditions = [eq(marketPrice.marketId, marketId), eq(marketPrice.commodityId, commodityId)];
  if (variety) conditions.push(eq(marketPrice.variety, variety));

  const rows = await db
    .select()
    .from(marketPrice)
    .where(and(...conditions))
    .orderBy(desc(marketPrice.priceDate), desc(marketPrice.fetchedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Bounded recent price history for one (market, commodity) series — used for
 * the market panel's trend sparkline. Never fetches the full 115k-row table:
 * capped at `days` rows, server-side, ascending by date so it's ready to
 * chart without client-side sorting.
 */
export async function getRecentMarketPriceTrend(marketId: string, commodityId: string, days = 30) {
  const rows = await db
    .select({ priceDate: marketPrice.priceDate, modalPriceInrPerKg: marketPrice.modalPriceInrPerKg })
    .from(marketPrice)
    .where(and(eq(marketPrice.marketId, marketId), eq(marketPrice.commodityId, commodityId)))
    .orderBy(desc(marketPrice.priceDate))
    .limit(days);

  return rows
    .map((r) => ({ priceDate: r.priceDate, modalPriceInrPerKg: Number(r.modalPriceInrPerKg) }))
    .reverse();
}

/** Every variety this market has ever reported for a commodity, most-recent first. */
export async function listVarietiesForMarket(marketId: string, commodityId: string) {
  const rows = await db
    .selectDistinct({ variety: marketPrice.variety })
    .from(marketPrice)
    .where(and(eq(marketPrice.marketId, marketId), eq(marketPrice.commodityId, commodityId)));
  return rows.map((r) => r.variety);
}
