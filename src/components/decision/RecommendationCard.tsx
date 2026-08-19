"use client";

import { AnimatePresence, motion } from "framer-motion";

import { AssumptionFlag } from "@/components/shared/AssumptionFlag";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { DecisionTrace } from "@/components/decision/DecisionTrace";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr, formatSignedIndicativeInr } from "@/lib/formatting/currency";
import { formatHours } from "@/lib/formatting/number";
import { addHoursIso, formatTime } from "@/lib/formatting/time";

/**
 * Section 16 — the most important component on the page. Every field is
 * read off decision, which is itself the direct, unmodified output of
 * evaluateDecision() — nothing here is hard-coded.
 */
export function RecommendationCard({ data }: { data: BatchViewData }) {
  const { decision } = data;

  if (decision.recommendedAction === null) {
    return <NoFeasiblePathwayCard data={data} />;
  }

  const winner = decision.rankedCandidates.find((c) => c.action === decision.recommendedAction);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-primary/30 bg-card p-5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          FreshRoute recommendation
        </span>
        <AnimatePresence mode="wait">
          <motion.h2
            key={decision.recommendedAction}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-2xl font-semibold tracking-tight text-primary"
          >
            {decision.recommendedAction}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Expected recoverable value"
          value={formatIndicativeInr(decision.recommendedValue ?? 0)}
          emphasize
          animateKey={`value-${decision.recommendedValue}`}
        />
        <Field
          label="Modelled uplift vs current plan"
          value={formatSignedIndicativeInr(decision.modelledUplift ?? 0)}
          tone={(decision.modelledUplift ?? 0) > 0 ? "success" : (decision.modelledUplift ?? 0) < 0 ? "critical" : undefined}
          animateKey={`uplift-${decision.modelledUplift}`}
        />
        <Field label="Baseline" value={formatIndicativeInr(decision.baselineValue)} animateKey={`baseline-${decision.baselineValue}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Evidence</span>
          {winner && <EvidenceBadge tier={winner.evidenceTier} className="w-fit" />}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">Confidence</span>
          <span className="font-mono text-xs text-warning">{decision.confidenceStatus}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <span className="text-[11px] text-muted-foreground">Valid for</span>
        <span className="text-sm text-foreground">Next decision window</span>
      </div>

      {decision.marginStatus === "NARROW" && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning">
          Narrow decision margin — top pathways are economically close; operator review recommended.
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Why</span>
        <ul className="flex flex-col gap-1.5">
          {decision.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-xs text-foreground/90">
              <span className="text-primary" aria-hidden="true">
                •
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Assumption flags
        </span>
        {decision.assumptionFlags.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {decision.assumptionFlags.map((flag) => (
              <AssumptionFlag key={flag} text={flag} />
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>

      <DecisionTrace data={data} />

      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        Operator reviews and executes. FreshRoute does not execute pathways automatically.
      </p>
    </div>
  );
}

function NoFeasiblePathwayCard({ data }: { data: BatchViewData }) {
  const { decision, currentRemainingUsefulLifeHours, batch, context } = data;
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);
  const nextReassessmentIso = addHoursIso(batch.telemetry.capturedAtIso, 1);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-card p-5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          FreshRoute recommendation
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-destructive">No feasible pathway</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Current conditions do not satisfy the feasibility constraints for any available recovery pathway.
      </p>

      <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
        <Field label="Current condition" value={batch.condition} />
        <Field label="Remaining useful life" value={formatHours(currentRemainingUsefulLifeHours)} tone="critical" />
        <Field
          label="Last known market state"
          value={plannedSnapshot ? `${formatIndicativeInr(plannedSnapshot.pricePerKg)}/kg, ${plannedSnapshot.demandSignal.toLowerCase()}` : "—"}
        />
        <Field label="Baseline (current plan)" value={formatIndicativeInr(decision.baselineValue)} />
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Next step</span>
        <span className="text-sm text-foreground">Hold and reassess at the next decision window.</span>
        <span className="font-mono text-xs text-muted-foreground">Next reassessment: {formatTime(nextReassessmentIso)}</span>
      </div>

      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        Operator reviews and executes. FreshRoute does not execute pathways automatically.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  emphasize,
  tone,
  animateKey,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "success" | "critical";
  animateKey?: string;
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "critical" ? "text-destructive" : "text-foreground";
  const valueClassName = emphasize ? `text-lg font-semibold ${toneClass}` : `text-sm font-medium ${toneClass}`;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {animateKey ? (
        <AnimatePresence mode="wait">
          <motion.span
            key={animateKey}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={valueClassName}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      ) : (
        <span className={valueClassName}>{value}</span>
      )}
    </div>
  );
}
