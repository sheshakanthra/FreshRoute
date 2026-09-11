// Live-database-backed page: never statically prerendered at build time.
export const dynamic = "force-dynamic";

import Link from "next/link";

import { STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { getRealBatchDashboardEntries } from "@/server/services/batchListService";
import { listRecommendationOutcomes } from "@/server/repositories/recommendationOutcomes";
import { formatIndicativeInr, formatSignedIndicativeInr } from "@/lib/formatting/currency";

/**
 * Section 9 / 42 — batches that need operator attention: the engine's
 * recommendation diverges from the current plan (DECISION_REQUIRED), or the
 * batch is at risk, including the no-feasible-pathway safe state (AT_RISK).
 * Sourced from the same getRealBatchDashboardEntries() the dashboard table uses.
 */
export default async function DecisionsPage() {
  const [allEntries, outcomeRows] = await Promise.all([getRealBatchDashboardEntries(), listRecommendationOutcomes()]);
  const entries = allEntries.filter(
    (entry) => entry.displayStatus === "DECISION_REQUIRED" || entry.displayStatus === "AT_RISK",
  );
  const recordedOutcomes = outcomeRows.filter((r) => r.outcome_record_id !== null);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Decisions</h1>
          <p className="text-sm text-muted-foreground">
            Batches with an active FreshRoute recommendation awaiting operator review.
          </p>
        </div>
        <a
          href="/api/export/recommendation-outcomes"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Export recommendation → execution → outcome (CSV)
        </a>
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
                className={`flex flex-wrap items-center gap-6 rounded-lg border border-border border-l-2 bg-card p-4 transition-colors hover:bg-accent/40 ${
                  entry.displayStatus === "AT_RISK" ? "border-l-destructive/70" : "border-l-transparent"
                }`}
              >
                <div className="flex min-w-[110px] flex-col gap-0.5">
                  <span className="font-mono text-sm text-foreground" title={entry.batch.id}>
                    {entry.batch.id.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{entry.batch.commodity}</span>
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Recent outcomes</h2>
          <p className="text-xs text-muted-foreground">
            Expected vs. realized value for recommendations with a recorded outcome — Section 14&apos;s outcome loop.
            {recordedOutcomes.length > 0 && recordedOutcomes.length < 5 && ` Early data (n=${recordedOutcomes.length}) — not a trend.`}
          </p>
        </div>

        {recordedOutcomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-8 text-center">
            <span className="text-sm font-medium text-foreground">No outcomes recorded yet</span>
            <span className="text-xs text-muted-foreground">
              Outcomes appear here once an accepted or overridden recommendation&apos;s result is recorded.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recordedOutcomes.map((row) => {
              const expected = Number(row.expected_recoverable_value_inr);
              const realized = row.realized_value_inr !== null ? Number(row.realized_value_inr) : null;
              const delta = realized !== null ? realized - expected : null;

              return (
                <div
                  key={row.recommendation_id}
                  className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex min-w-[150px] flex-col gap-0.5">
                    <span className="font-mono text-sm text-foreground" title={row.batch_id}>
                      {row.batch_id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {row.executed_action_code ?? row.chosen_action_code}
                    </span>
                  </div>

                  {/* Expected -> realized is one comparison, not three columns:
                      the two figures sit on one baseline with the arrow
                      between them, and only the delta carries weight. */}
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">Expected</span>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {formatIndicativeInr(expected)}
                      </span>
                    </div>
                    <span className="pb-0.5 text-xs text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">Realized</span>
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {realized !== null ? formatIndicativeInr(realized) : "—"}
                      </span>
                    </div>
                  </div>

                  {delta !== null && (
                    <div className="flex flex-col gap-0.5">
                      {/* The word carries the sign for anyone who cannot use
                          the colour; the arrow glyph carries it for anyone
                          scanning. */}
                      <span className="text-[11px] text-muted-foreground">
                        {delta >= 0 ? "Above expected" : "Below expected"}
                      </span>
                      <span
                        className={`font-mono text-base font-semibold tabular-nums ${
                          delta >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        <span aria-hidden="true">{delta >= 0 ? "▲ " : "▼ "}</span>
                        {formatSignedIndicativeInr(delta)}
                      </span>
                    </div>
                  )}

                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Recorded{" "}
                    {row.outcome_recorded_at ? new Date(row.outcome_recorded_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
