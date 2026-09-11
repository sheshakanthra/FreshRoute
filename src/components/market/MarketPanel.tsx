"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { ProvenanceBadge } from "@/components/shared/ProvenanceBadge";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours } from "@/lib/formatting/number";

const GRID_COLUMNS = "grid grid-cols-[1.4fr_90px_90px_100px_70px_90px_1.4fr_90px_110px] items-center gap-3";

type PriceTrendPoint = { priceDate: string; modalPriceInrPerKg: number };

/**
 * Section 12 — reachable markets for this batch's commodity. Price
 * provenance is per-market, not panel-wide: a market with a real
 * market_price row and one that fell back to an indicative figure can
 * appear side by side in the same table (see buildRealDecisionContext.ts —
 * dataProvenance is set per MarketSnapshot from whether a real price was
 * actually found), so the provenance badge lives in its own column and
 * reads snapshot.dataProvenance per row rather than asserting one blanket
 * "indicative" label for the whole panel regardless of what's actually
 * shown.
 */
export function MarketPanel({
  data,
  priceTrends,
}: {
  data: BatchViewData;
  priceTrends?: Record<string, PriceTrendPoint[]>;
}) {
  const { batch, context, candidates } = data;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Market intelligence</h2>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className={`${GRID_COLUMNS} border-b border-border px-2 pb-2`}>
            {["Market", "Price/kg", "Source", "Demand", "ETA", "Transit cost", "Expected arrival condition", "30d trend", "Potential recovery"].map(
              (heading) => (
                <span key={heading} className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {heading}
                </span>
              ),
            )}
          </div>

          <div className="divide-y divide-border">
            {context.markets.map((market) => {
              const snapshot = context.marketSnapshots.find((s) => s.marketId === market.id);
              const isPlanned = market.id === batch.plannedMarketId;
              const candidate = candidates.find((c) => c.targetMarketId === market.id && c.feasibility === "FEASIBLE");
              const trend = priceTrends?.[market.id] ?? [];

              return (
                <div key={market.id} className={`${GRID_COLUMNS} px-2 py-2.5 text-sm`}>
                  <span className="text-foreground">
                    {market.name}
                    {isPlanned && <span className="ml-1.5 text-[11px] text-muted-foreground">(planned)</span>}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {snapshot ? formatIndicativeInr(snapshot.pricePerKg) : "—"}
                  </span>
                  <span>{snapshot && <ProvenanceBadge provenance={snapshot.dataProvenance} />}</span>
                  <span className="text-muted-foreground capitalize">{snapshot?.demandSignal.toLowerCase() ?? "—"}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHours(market.etaHours)}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatIndicativeInr(market.transitCostPerKg)}/kg
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={snapshot?.expectedArrivalConditionNote}>
                    {snapshot?.expectedArrivalConditionNote ?? "—"}
                  </span>
                  <span className="h-6 w-full">
                    {trend.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                          <Line
                            type="monotone"
                            dataKey="modalPriceInrPerKg"
                            stroke="var(--muted-foreground)"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No price history</span>
                    )}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {candidate ? formatIndicativeInr(candidate.expectedRecovery) : "Not feasible"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
