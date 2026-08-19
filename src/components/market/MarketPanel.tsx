import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours } from "@/lib/formatting/number";

const GRID_COLUMNS = "grid grid-cols-[1.4fr_90px_100px_70px_90px_1.4fr_110px] items-center gap-3";

/** Section 12 — reachable markets for this batch's commodity, each market's economics indicative, never live. */
export function MarketPanel({ data }: { data: BatchViewData }) {
  const { batch, context, candidates } = data;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Market intelligence</h2>
        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Indicative demo value
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className={`${GRID_COLUMNS} border-b border-border px-2 pb-2`}>
            {["Market", "Price/kg", "Demand", "ETA", "Transit cost", "Expected arrival condition", "Potential recovery"].map(
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

              return (
                <div key={market.id} className={`${GRID_COLUMNS} px-2 py-2.5 text-sm`}>
                  <span className="text-foreground">
                    {market.name}
                    {isPlanned && <span className="ml-1.5 text-[11px] text-muted-foreground">(planned)</span>}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {snapshot ? formatIndicativeInr(snapshot.pricePerKg) : "—"}
                  </span>
                  <span className="text-muted-foreground capitalize">{snapshot?.demandSignal.toLowerCase() ?? "—"}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHours(market.etaHours)}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatIndicativeInr(market.transitCostPerKg)}/kg
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={snapshot?.expectedArrivalConditionNote}>
                    {snapshot?.expectedArrivalConditionNote ?? "—"}
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
