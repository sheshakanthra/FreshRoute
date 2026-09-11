import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr } from "@/lib/formatting/currency";

/**
 * Section 4/12 fix — economic risk was previously only a fleet-level KPI
 * (dashboard's "Potential value at risk"); it wasn't a first-class element
 * on the batch page itself. Rendered right after BatchHeader, before
 * Condition/Logistics, per the required hierarchy: state -> economic risk ->
 * options -> recommendation -> why -> next step.
 *
 * Every figure here is a re-presentation of values evaluateDecision() and
 * buildRealDecisionContext() already computed — the undecayed market-value
 * multiplication mirrors the same one batchListService.ts already does for
 * the dashboard's grossPlannedValue KPI, just for this one batch. No decay
 * curve or new economics is computed in this component.
 */
export function EconomicRiskPanel({ data }: { data: BatchViewData }) {
  const { batch, context, decision } = data;
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);

  const marketValue = plannedSnapshot ? batch.quantityKg * plannedSnapshot.pricePerKg : null;
  const currentRecoverable = decision.baselineValue;
  const bestAvailable = decision.recommendedValue ?? currentRecoverable;
  const valueAtRisk = marketValue !== null ? Math.max(0, marketValue - currentRecoverable) : null;

  const maxScale = Math.max(marketValue ?? 0, currentRecoverable, bestAvailable, 1);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-warning/30 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Economic risk</h2>
        {valueAtRisk !== null && valueAtRisk > 0 && (
          <span className="font-mono text-lg font-semibold tabular-nums text-warning">
            {formatIndicativeInr(valueAtRisk)} value gap
          </span>
        )}
      </div>

      {valueAtRisk !== null && valueAtRisk > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-muted-foreground">
            Current gap vs. undecayed market value — not a projected future loss.
          </p>
          <p className="text-sm text-foreground/90">This batch is losing economic value with time.</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <RiskBar label="Market value (undecayed)" value={marketValue} max={maxScale} tone="neutral" />
        <RiskBar label="Current recoverable value" value={currentRecoverable} max={maxScale} tone="warning" />
        <RiskBar label="Best available recovery" value={bestAvailable} max={maxScale} tone="success" />
      </div>
    </div>
  );
}

function RiskBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number | null;
  max: number;
  tone: "neutral" | "warning" | "success";
}) {
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
  const barClass = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-muted-foreground/60";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground">
          {value !== null ? formatIndicativeInr(value) : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
