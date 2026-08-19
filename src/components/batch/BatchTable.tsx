import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/shared/StatusPill";
import { CONDITION_TONE, STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import type { BatchDashboardEntry } from "@/demo/scenarios/dashboardDecisions";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours, formatKg } from "@/lib/formatting/number";
import { cn } from "@/lib/utils";

const GRID_COLUMNS =
  "grid grid-cols-[100px_110px_1fr_1fr_90px_100px_70px_90px_110px_120px_150px_20px] items-center gap-3";

/** Section 9 — the high-density active batch table. Each row routes to /batches/[id]. */
export function BatchTable({ entries }: { entries: BatchDashboardEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-[1300px]">
        <div className={cn(GRID_COLUMNS, "border-b border-border bg-muted/40 px-4 py-2")}>
          {[
            "Batch",
            "Commodity",
            "Origin",
            "Destination",
            "Quantity",
            "Condition",
            "RUL",
            "Current plan",
            "Recommendation",
            "Expected value",
            "Status",
            "",
          ].map((heading) => (
            <span key={heading || "spacer"} className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {heading}
            </span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {entries.map((entry) => {
            const { batch, decision, displayStatus, currentRemainingUsefulLifeHours, destinationMarketName } = entry;
            const recommendationDiffers = decision.recommendedAction !== null && decision.recommendedAction !== batch.currentPlanAction;

            return (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className={cn(GRID_COLUMNS, "px-4 py-3 text-sm transition-colors hover:bg-accent/40")}
              >
                <span className="font-mono text-xs text-foreground">{batch.id}</span>
                <span className="truncate text-foreground">{batch.commodity}</span>
                <span className="truncate text-muted-foreground" title={batch.currentLocationLabel}>
                  {batch.currentLocationLabel}
                </span>
                <span className="truncate text-muted-foreground" title={destinationMarketName}>
                  {destinationMarketName}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatKg(batch.quantityKg)}</span>
                <StatusPill tone={CONDITION_TONE[batch.condition]} className="w-fit capitalize">
                  {batch.condition.toLowerCase()}
                </StatusPill>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    currentRemainingUsefulLifeHours <= 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {formatHours(currentRemainingUsefulLifeHours)}
                </span>
                <span className="text-muted-foreground">{batch.currentPlanAction}</span>
                <span className={cn("font-medium", recommendationDiffers ? "text-primary" : "text-foreground")}>
                  {decision.recommendedAction ?? "NO PATHWAY"}
                </span>
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {decision.recommendedValue !== null ? formatIndicativeInr(decision.recommendedValue) : "—"}
                </span>
                <StatusPill tone={STATUS_TONE[displayStatus]} className="w-fit">
                  {STATUS_LABEL[displayStatus]}
                </StatusPill>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
