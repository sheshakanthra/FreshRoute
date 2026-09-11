import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

/**
 * Section 4/12 fix — economic risk as a first-class element on the batch page
 * itself, rendered right after BatchHeader per the required hierarchy:
 * state -> economic risk -> recommendation -> why -> operator action.
 *
 * Every figure here is a re-presentation of values evaluateDecision() and
 * buildRealDecisionContext() already computed — the undecayed market-value
 * multiplication mirrors the same one batchListService.ts already does for
 * the dashboard's grossPlannedValue KPI, just for this one batch. No decay
 * curve or new economics is computed in this component, and the value-gap
 * arithmetic is byte-for-byte what it was.
 *
 * What changed is the framing. Three equal-length bars read as three
 * independent forecasts. One bar, in which the recoverable portion and the
 * gap are two segments of the SAME undecayed-market-value track, reads as
 * what it actually is: a gap that exists right now between what this batch
 * is worth on paper and what it can still return. The panel's border also
 * dropped from a full warning outline to a single warning edge, so it sits
 * second to the recommendation rather than competing with it.
 */
export function EconomicRiskPanel({ data }: { data: BatchViewData }) {
  const { batch, context, decision } = data;
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);

  const marketValue = plannedSnapshot ? batch.quantityKg * plannedSnapshot.pricePerKg : null;
  const currentRecoverable = decision.baselineValue;
  const bestAvailable = decision.recommendedValue ?? currentRecoverable;
  const valueAtRisk = marketValue !== null ? Math.max(0, marketValue - currentRecoverable) : null;

  const hasGap = valueAtRisk !== null && valueAtRisk > 0;
  const recoverablePct =
    marketValue !== null && marketValue > 0 ? Math.max(0, Math.min(100, (currentRecoverable / marketValue) * 100)) : 0;
  const gapPct = marketValue !== null && marketValue > 0 ? Math.max(0, 100 - recoverablePct) : 0;

  return (
    <section
      aria-labelledby="economic-risk-heading"
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-4",
        hasGap && "border-l-2 border-l-warning/70",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <h2 id="economic-risk-heading" className="text-sm font-semibold tracking-tight">
            Economic risk
          </h2>
          {hasGap && (
            <p className="text-xs text-foreground/80">This batch is losing economic value with time.</p>
          )}
        </div>

        {hasGap && (
          <div className="flex flex-col items-start gap-0.5 sm:items-end">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Value gap right now
            </span>
            <span className="font-mono text-xl leading-none font-semibold tabular-nums text-warning">
              {formatIndicativeInr(valueAtRisk)}
            </span>
          </div>
        )}
      </div>

      {marketValue !== null && (
        <div className="flex flex-col gap-2">
          {/* One track = the undecayed market value. The two segments are the
              current split of it, not a projection of where it is heading. */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div className="h-full bg-muted-foreground/55" style={{ width: `${recoverablePct}%` }} />
            <div className="h-full bg-warning/70" style={{ width: `${gapPct}%` }} />
          </div>

          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
            <Segment
              swatch="bg-muted-foreground/55"
              label="Recoverable now"
              value={formatIndicativeInr(currentRecoverable)}
            />
            <Segment swatch="bg-warning/70" label="Value gap now" value={formatIndicativeInr(valueAtRisk ?? 0)} />
            {/* "Reference", not "of": when current recoverable value is
                negative the gap legitimately exceeds the market value, and
                "of X" would read as a false proportion. */}
            <span className="text-[11px] text-muted-foreground">
              Reference: {formatIndicativeInr(marketValue)} undecayed market value
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border pt-3">
        <span className="text-[11px] text-muted-foreground">
          Best available recovery across all pathways
        </span>
        <span
          className={cn(
            "font-mono text-sm font-medium tabular-nums",
            // A negative best-available figure must never render as a green
            // "good" number just because it is the best of a bad set.
            bestAvailable > 0 ? "text-success" : bestAvailable < 0 ? "text-destructive" : "text-foreground",
          )}
        >
          {formatIndicativeInr(bestAvailable)}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        A current-state gap between today&apos;s undecayed market value and what is recoverable today — not a
        projected future loss.
      </p>
    </section>
  );
}

/** Swatch + its own text label: the segment colours are never the only carrier. */
function Segment({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={cn("size-2 shrink-0 translate-y-[-1px] rounded-[2px]", swatch)} aria-hidden="true" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs tabular-nums text-foreground">{value}</span>
    </span>
  );
}
