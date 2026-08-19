import { AlertTriangle, ClipboardCheck, Package, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardKpis } from "@/demo/scenarios/dashboardDecisions";
import { formatIndicativeInr } from "@/lib/formatting/currency";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning";
}

function StatTile({ label, value, icon: Icon, tone = "neutral" }: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden="true" />
      </div>
      <span className={cn("text-2xl font-semibold tracking-tight", tone === "warning" && "text-warning")}>
        {value}
      </span>
    </div>
  );
}

/** Section 9 — the four top-of-dashboard KPIs, all computed from the same engine output the batch table renders. */
export function KPIGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
    </div>
  );
}
