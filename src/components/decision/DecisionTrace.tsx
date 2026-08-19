"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { DATA_PROVENANCE } from "@/domain/engine";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours } from "@/lib/formatting/number";

/** Section 17 — the auditable trace behind a recommendation: inputs, feasibility, value calc, ranking, explanation, provenance, engine. */
export function DecisionTrace({ data }: { data: BatchViewData }) {
  const { batch, context, decision, candidates, currentRemainingUsefulLifeHours } = data;
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);

  const feasibleRankedAsc = decision.rankedCandidates.filter((c) => c.feasible).sort((a, b) => a.rank - b.rank);
  const winner = feasibleRankedAsc[0];
  const runnerUp = feasibleRankedAsc[1];
  const winnerValue = winner?.expectedRecovery ?? null;

  const explanation = winner
    ? runnerUp
      ? `${winner.action} beat ${runnerUp.action} by ${formatIndicativeInr(winner.expectedRecovery - runnerUp.expectedRecovery)} (${decision.decisionMarginPct?.toFixed(1) ?? "—"}% margin, ${decision.marginStatus.toLowerCase()}).`
      : `${winner.action} was the only feasible pathway.`
    : "No feasible pathway was available for comparison.";

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
        View decision trace
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Decision trace — {batch.id}</DialogTitle>
          <DialogDescription>Auditable snapshot of every input and calculation behind this recommendation.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          <TraceSection title="Input snapshot">
            <TraceRow label="Condition" value={batch.condition} />
            <TraceRow label="Remaining useful life" value={formatHours(currentRemainingUsefulLifeHours)} />
            <TraceRow
              label="Market state"
              value={
                plannedSnapshot
                  ? `${formatIndicativeInr(plannedSnapshot.pricePerKg)}/kg, ${plannedSnapshot.demandSignal.toLowerCase()} demand`
                  : "—"
              }
            />
            <TraceRow
              label="Logistics"
              value={`${formatHours(batch.transitDelayHours)} delay, ${formatHours(batch.telemetry.thermalExposureHours)} thermal exposure`}
            />
          </TraceSection>

          <TraceSection title="Feasibility">
            <div className="flex flex-col gap-1.5">
              {decision.feasibilityResults.map((f) => (
                <div key={f.action} className="flex items-start justify-between gap-3 text-xs">
                  <span className="w-20 shrink-0 font-medium text-foreground">{f.action}</span>
                  <span className={f.feasible ? "w-14 shrink-0 text-success" : "w-14 shrink-0 text-destructive"}>
                    {f.feasible ? "Passed" : "Failed"}
                  </span>
                  <span className="flex-1 text-right text-muted-foreground">{f.reason ?? "—"}</span>
                </div>
              ))}
            </div>
          </TraceSection>

          <TraceSection title="Value calculation">
            <div className="flex flex-col gap-1.5">
              {candidates.map((c) => (
                <div key={c.action} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-xs">
                  <span className="w-20 font-medium text-foreground">{c.action}</span>
                  <span className="text-muted-foreground">Recovery {formatIndicativeInr(c.expectedRecovery)}</span>
                  <span className="text-muted-foreground">
                    Cost {formatIndicativeInr(c.transportCost + c.handlingCost + c.storageCost + c.processingCost)}
                  </span>
                  <span className="text-muted-foreground">Risk {formatIndicativeInr(c.riskAdjustment)}</span>
                </div>
              ))}
              <div className="mt-1 border-t border-border pt-1.5 text-xs text-muted-foreground">
                Baseline (current plan): {formatIndicativeInr(decision.baselineValue)}
              </div>
            </div>
          </TraceSection>

          <TraceSection title="Ranking">
            <div className="flex flex-col gap-1.5">
              {decision.rankedCandidates.map((c) => (
                <div key={c.action} className="flex items-center justify-between text-xs">
                  <span className="w-6 font-mono text-muted-foreground">{c.rank || "—"}</span>
                  <span className="w-20 font-medium text-foreground">{c.action}</span>
                  <span className="w-24 text-right font-mono text-muted-foreground tabular-nums">
                    {formatIndicativeInr(c.score)}
                  </span>
                  <span className="w-28 text-right font-mono text-muted-foreground tabular-nums">
                    {c.feasible && winnerValue !== null ? `Δ ${formatIndicativeInr(c.expectedRecovery - winnerValue)}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </TraceSection>

          <TraceSection title="Explanation">
            <p className="text-xs text-muted-foreground">{explanation}</p>
          </TraceSection>

          <TraceSection title="Provenance">
            <TraceRow label="Telemetry" value={DATA_PROVENANCE} mono />
            <TraceRow label="Market values" value={DATA_PROVENANCE} mono />
          </TraceSection>

          <TraceSection title="Engine">
            <TraceRow label="Engine version" value={decision.engineVersion} mono />
            <TraceRow label="Scenario" value={context.scenario.name} mono />
          </TraceSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TraceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 first:border-0 first:pt-0">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
      {children}
    </div>
  );
}

function TraceRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
