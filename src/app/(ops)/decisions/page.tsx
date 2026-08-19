import Link from "next/link";

import { STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { getBatchDashboardEntries } from "@/demo/scenarios/dashboardDecisions";
import { formatIndicativeInr } from "@/lib/formatting/currency";

/**
 * Section 9 / 42 — batches that need operator attention: the engine's
 * recommendation diverges from the current plan (DECISION_REQUIRED), or the
 * batch is at risk, including the no-feasible-pathway safe state (AT_RISK).
 * Sourced from the same getBatchDashboardEntries() the dashboard table uses.
 */
export default function DecisionsPage() {
  const entries = getBatchDashboardEntries().filter(
    (entry) => entry.displayStatus === "DECISION_REQUIRED" || entry.displayStatus === "AT_RISK",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Decisions</h1>
        <p className="text-sm text-muted-foreground">
          Batches with an active FreshRoute recommendation awaiting operator review.
        </p>
      </div>

      <DemoBanner />

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-12 text-center">
          <span className="text-sm font-medium text-foreground">No batches currently need a decision</span>
          <span className="text-xs text-muted-foreground">
            Every active batch matches its current plan with no unresolved risk.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const winner = entry.decision.rankedCandidates.find(
              (c) => c.action === entry.decision.recommendedAction,
            );

            return (
              <Link
                key={entry.batch.id}
                href={`/batches/${entry.batch.id}`}
                className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex min-w-[110px] flex-col gap-0.5">
                  <span className="font-mono text-sm font-semibold text-foreground">{entry.batch.id}</span>
                  <span className="text-xs text-muted-foreground">{entry.batch.commodity}</span>
                </div>

                <StatusPill tone={STATUS_TONE[entry.displayStatus]}>{STATUS_LABEL[entry.displayStatus]}</StatusPill>

                <div className="flex min-w-[100px] flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Recommendation</span>
                  <span className="text-sm font-medium text-foreground">
                    {entry.decision.recommendedAction ?? "NO PATHWAY"}
                  </span>
                </div>

                <div className="flex min-w-[100px] flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Expected value</span>
                  <span className="font-mono text-sm text-foreground tabular-nums">
                    {entry.decision.recommendedValue !== null
                      ? formatIndicativeInr(entry.decision.recommendedValue)
                      : "—"}
                  </span>
                </div>

                {winner && (
                  <div className="ml-auto">
                    <EvidenceBadge tier={winner.evidenceTier} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
