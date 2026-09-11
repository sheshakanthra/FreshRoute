import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardKpis } from "@/demo/scenarios/dashboardDecisions";
import type { OutcomeKpis } from "@/server/services/batchListService";
import { formatIndicativeInr } from "@/lib/formatting/currency";

/**
 * Section 9 — the top-of-dashboard KPIs. Same six figures as before, from the
 * same engine output the batch table renders (first four) and the real,
 * thin recommendation_outcomes data (last two) — still "—" with a
 * "no outcomes yet" caption rather than a fabricated ₹0 when nothing has
 * been recorded.
 *
 * They are no longer six tiles of equal weight. They are tiered:
 *   fleet state (active, at-risk) | economic exposure (value at risk)
 *   ---------------------------------------------------------------
 *   outcomes so far (recovered, recorded loss, recommendations today)
 *
 * The outcome tier is the quiet one — n=1 data must not read as loudly as
 * live fleet state. At-risk is the only tile allowed a warning accent, and
 * only when it is actually > 0; at 0 it reads exactly as calm as the rest.
 * Icons were removed from every tile except that one warning state, where
 * the triangle is the non-color carrier of "this needs attention".
 */
export function KPIGrid({ kpis, outcomeKpis }: { kpis: DashboardKpis; outcomeKpis?: OutcomeKpis }) {
  const hasAtRisk = kpis.atRiskBatches > 0;
  const hasOutcomes = outcomeKpis !== undefined && outcomeKpis.outcomeCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.7fr)]">
        <FleetTile label="Active batches" value={String(kpis.activeBatches)} />

        <FleetTile
          label="At-risk batches"
          value={String(kpis.atRiskBatches)}
          alert={hasAtRisk}
          note={hasAtRisk ? (kpis.atRiskBatches === 1 ? "needs attention" : "need attention") : "none at risk"}
        />

        {/* The headline economic figure of the band. Deliberately NOT tinted
            warning — at-risk above owns the one warning accent; this one leads
            on size and on everything around it being quieter. */}
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:col-span-2 xl:col-span-1">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Potential value at risk
          </span>
          <span className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums text-foreground">
            {formatIndicativeInr(kpis.potentialValueAtRisk)}
          </span>
          <span className="text-[11px] text-muted-foreground">Gross planned value of at-risk batches</span>
        </div>
      </div>

      {/* Quiet tier: recorded history and today's activity, not live fleet state. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Outcomes so far</span>

        <QuietStat
          label="Value recovered"
          value={hasOutcomes ? formatIndicativeInr(outcomeKpis.valueRecoveredInr) : "—"}
        />
        <QuietStat label="Recorded loss" value={hasOutcomes ? `${outcomeKpis.recordedLossKg.toFixed(1)} kg` : "—"} />

        <span className="text-[11px] text-muted-foreground">
          {outcomeKpis
            ? hasOutcomes
              ? `n=${outcomeKpis.outcomeCount} — early data, not a trend`
              : "No outcomes recorded yet"
            : "No outcome data"}
        </span>

        <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

        <QuietStat label="Recommendations issued today" value={String(kpis.recommendationsIssuedToday)} />
      </div>
    </div>
  );
}

function FleetTile({
  label,
  value,
  alert,
  note,
}: {
  label: string;
  value: string;
  alert?: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 transition-colors duration-300",
        alert ? "border-warning/30" : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* Shape carrier: risk is never signalled by the warning hue alone. */}
        {alert && <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-hidden="true" />}
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      </div>
      <span
        className={cn(
          "font-mono text-xl leading-none font-semibold tabular-nums transition-colors duration-300",
          alert ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </span>
      {note && (
        <span className={cn("text-[11px]", alert ? "text-warning" : "text-muted-foreground")}>{note}</span>
      )}
    </div>
  );
}

function QuietStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}
