import { AlertTriangle, ClipboardCheck, Package, TrendingDown, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardKpis } from "@/demo/scenarios/dashboardDecisions";
import type { OutcomeKpis } from "@/server/services/batchListService";
import { formatIndicativeInr } from "@/lib/formatting/currency";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning";
  caption?: string;
}

function StatTile({ label, value, icon: Icon, tone = "neutral", caption }: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden="true" />
      </div>
      <span className={cn("text-2xl font-semibold tracking-tight", tone === "warning" && "text-warning")}>
        {value}
      </span>
      {caption && <span className="text-[11px] text-muted-foreground">{caption}</span>}
    </div>
  );
}

/** Section 9 — the top-of-dashboard KPIs. First four from the same engine output the batch table renders; the
 *  last two (Section 5, moved from F to E once D4 shipped) aggregate the real, thin recommendation_outcomes data —
 *  rendered as "—" with a "no outcomes yet" caption rather than a fabricated ₹0 when nothing has been recorded. */
export function KPIGrid({ kpis, outcomeKpis }: { kpis: DashboardKpis; outcomeKpis?: OutcomeKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatTile label="Active batches" value={String(kpis.activeBatches)} icon={Package} />
      <StatTile
        label="At-risk batches"
        value={String(kpis.atRiskBatches)}
        icon={AlertTriangle}
        tone={kpis.atRiskBatches > 0 ? "warning" : "neutral"}
      />
      <StatTile
        label="Potential value at risk"
        value={formatIndicativeInr(kpis.potentialValueAtRisk)}
        icon={Wallet}
        tone={kpis.potentialValueAtRisk > 0 ? "warning" : "neutral"}
      />
      <StatTile
        label="Recommendations issued today"
        value={String(kpis.recommendationsIssuedToday)}
        icon={ClipboardCheck}
      />
      <StatTile
        label="Value recovered"
        value={outcomeKpis && outcomeKpis.outcomeCount > 0 ? formatIndicativeInr(outcomeKpis.valueRecoveredInr) : "—"}
        icon={Wallet}
        caption={
          outcomeKpis
            ? outcomeKpis.outcomeCount > 0
              ? `n=${outcomeKpis.outcomeCount}, early data`
              : "No outcomes recorded yet"
            : undefined
        }
      />
      <StatTile
        label="Recorded loss"
        value={outcomeKpis && outcomeKpis.outcomeCount > 0 ? `${outcomeKpis.recordedLossKg.toFixed(1)} kg` : "—"}
        icon={TrendingDown}
        caption={
          outcomeKpis
            ? outcomeKpis.outcomeCount > 0
              ? `n=${outcomeKpis.outcomeCount}, early data`
              : "No outcomes recorded yet"
            : undefined
        }
      />
    </div>
  );
}
