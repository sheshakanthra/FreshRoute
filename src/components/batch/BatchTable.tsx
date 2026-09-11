import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/shared/StatusPill";
import { CONDITION_TONE, STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import type { BatchDashboardEntry } from "@/demo/scenarios/dashboardDecisions";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours, formatKg } from "@/lib/formatting/number";
import { cn } from "@/lib/utils";

/**
 * Section 9 — the active batch decision queue. Each row routes to /batches/[id].
 *
 * This used to be eleven columns of equal weight in which a 36-character UUID
 * was the widest thing on screen. It is now split into a primary set — batch,
 * condition, RUL, recommendation, expected value, status — and a secondary set
 * (origin, destination, quantity, current plan, commodity) relocated to one
 * quiet metadata line under each row. Nothing was removed: the UUID is
 * truncated to its first segment with the full value on hover/title, and every
 * former column still renders.
 *
 * Below `md` the same DOM reflows into a stacked card per batch — no
 * horizontal scrolling to reach the recommendation — using per-cell labels
 * that are hidden once the header row appears. Source order is the reading
 * order at every width; no CSS `order` is used anywhere.
 */
const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1.3fr)_104px_84px_minmax(0,1fr)_116px_150px_16px] md:items-center md:gap-x-4 md:gap-y-1.5";

const HEADINGS = ["Batch", "Condition", "RUL", "Recommendation", "Expected value", "Status", ""];

export function BatchTable({ entries }: { entries: BatchDashboardEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="md:min-w-[880px]">
        <div className={cn(ROW_GRID, "hidden border-b border-border bg-muted/40 py-2 pr-4 pl-[calc(1rem-2px)]")}>
          {HEADINGS.map((heading, i) => (
            <span
              key={heading || `spacer-${i}`}
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {heading}
            </span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {entries.map((entry) => {
            const { batch, decision, displayStatus, currentRemainingUsefulLifeHours, destinationMarketName } = entry;
            const noPathway = decision.recommendedAction === null;
            const recommendationDiffers = !noPathway && decision.recommendedAction !== batch.currentPlanAction;
            const needsAttention = displayStatus === "AT_RISK" || noPathway;
            const rulCritical = currentRemainingUsefulLifeHours <= 0;

            return (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className={cn(
                  ROW_GRID,
                  "flex flex-col gap-2 border-l-2 py-3 pr-4 pl-[calc(1rem-2px)] text-sm transition-colors hover:bg-accent/40",
                  // One quiet signal, catchable in a single downward scan.
                  // The "At risk" / "NO PATHWAY" text below carries the same
                  // meaning for anyone who can't use the tint.
                  needsAttention ? "border-l-destructive/70 bg-destructive/[0.04]" : "border-l-transparent",
                )}
              >
                <div className="flex items-baseline gap-2 md:flex-col md:items-start md:gap-0.5">
                  <span className="font-mono text-sm text-foreground" title={batch.id}>
                    {batch.id.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{batch.commodity}</span>
                </div>

                <Cell label="Condition">
                  <StatusPill tone={CONDITION_TONE[batch.condition]} className="w-fit capitalize">
                    {batch.condition.toLowerCase()}
                  </StatusPill>
                </Cell>

                <Cell label="RUL">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums transition-colors duration-300",
                      // Negative hours are the non-colour carrier of "past end
                      // of useful life"; healthy RUL stays unremarkable.
                      rulCritical ? "font-semibold text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {formatHours(currentRemainingUsefulLifeHours)}
                  </span>
                </Cell>

                <Cell label="Recommendation">
                  <span
                    className={cn(
                      "font-medium",
                      noPathway ? "text-destructive" : recommendationDiffers ? "text-primary" : "text-foreground",
                    )}
                  >
                    {decision.recommendedAction ?? "NO PATHWAY"}
                  </span>
                </Cell>

                <Cell label="Expected value">
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {decision.recommendedValue !== null ? formatIndicativeInr(decision.recommendedValue) : "—"}
                  </span>
                </Cell>

                <Cell label="Status">
                  <StatusPill tone={STATUS_TONE[displayStatus]} className="w-fit">
                    {STATUS_LABEL[displayStatus]}
                  </StatusPill>
                </Cell>

                <ChevronRight className="hidden size-4 text-muted-foreground md:block" aria-hidden="true" />

                {/* Secondary metadata: present, complete, and deliberately quiet. */}
                <span className="text-[11px] text-muted-foreground md:col-span-full">
                  <span className="text-muted-foreground">{batch.currentLocationLabel}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="text-muted-foreground">{destinationMarketName}</span>
                  {" · "}
                  {formatKg(batch.quantityKg)}
                  {" · current plan "}
                  {batch.currentPlanAction}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Below `md` the header row is hidden, so each cell carries its own label. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 md:block">
      <span className="text-[11px] text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  );
}
