"use client";

import { AnimatePresence, motion } from "framer-motion";

import { AssumptionFlag } from "@/components/shared/AssumptionFlag";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { DecisionTrace } from "@/components/decision/DecisionTrace";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr, formatSignedIndicativeInr } from "@/lib/formatting/currency";
import { formatHours } from "@/lib/formatting/number";
import { addHoursIso, formatTime } from "@/lib/formatting/time";
import { cn } from "@/lib/utils";

/**
 * Section 16 — the most important component on the page. Every field is
 * read off decision, which is itself the direct, unmodified output of
 * evaluateDecision() — nothing here is hard-coded.
 *
 * It used to be eight sections separated by eight horizontal rules, which
 * read as a list of unrelated blocks rather than one decision. It is now one
 * surface: the chosen action and its expected recovery are a single group,
 * the supporting economics sit under them, evidence / confidence / validity
 * are one compact line, and the "why" is tethered to the decision by a left
 * rule instead of being cut off from it by a full-width one. Nothing here
 * grew; six of the eight rules were deleted and whitespace does their job.
 *
 * Provenance, evidence tier, confidence status, assumption flags and the
 * "operator reviews and executes" line all still render exactly as before —
 * quieter in treatment, unchanged in meaning, including the explicit
 * "Assumption flags: none" state.
 */
export function RecommendationCard({ data }: { data: BatchViewData }) {
  const { decision } = data;

  if (decision.recommendedAction === null) {
    return <NoFeasiblePathwayCard data={data} />;
  }

  const winner = decision.rankedCandidates.find((c) => c.action === decision.recommendedAction);
  const uplift = decision.modelledUplift ?? 0;

  return (
    <section
      aria-labelledby="recommendation-heading"
      className="flex flex-col gap-5 rounded-lg border border-primary/30 bg-card p-5"
    >
      {/* 1. The decision itself: action and what it is worth, as one group. */}
      <div className="flex flex-col gap-3">
        <span
          id="recommendation-heading"
          className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          FreshRoute recommendation
        </span>

        <AnimatePresence mode="wait">
          <motion.h2
            key={decision.recommendedAction}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-3xl leading-none font-semibold tracking-tight text-primary"
          >
            {decision.recommendedAction}
          </motion.h2>
        </AnimatePresence>

        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">Expected recoverable value</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`value-${decision.recommendedValue}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="font-mono text-2xl leading-none font-semibold tabular-nums text-foreground"
            >
              {formatIndicativeInr(decision.recommendedValue ?? 0)}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Supporting economics — same figures, compact and secondary. */}
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <MiniField
          label="Uplift vs current plan"
          value={formatSignedIndicativeInr(uplift)}
          animateKey={`uplift-${decision.modelledUplift}`}
          tone={uplift > 0 ? "success" : uplift < 0 ? "critical" : undefined}
        />
        <MiniField
          label="Baseline (current plan)"
          value={formatIndicativeInr(decision.baselineValue)}
          animateKey={`baseline-${decision.baselineValue}`}
        />
      </div>

      {/* 3. Evidence, confidence and validity: one quiet line, full meaning. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
        {winner && <EvidenceBadge tier={winner.evidenceTier} />}
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Confidence: {decision.confidenceStatus}
        </span>
        <span className="text-[11px] text-muted-foreground">Valid for the next decision window</span>
      </div>

      {decision.marginStatus === "NARROW" && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning">
          Narrow decision margin — top pathways are economically close; operator review recommended.
        </div>
      )}

      {/* 4. Why — tethered to the decision above by a rule that connects
             rather than one that separates. */}
      <div className="flex flex-col gap-2 border-l-2 border-primary/40 pl-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Why this recommendation
        </span>
        <ul className="flex flex-col gap-1.5">
          {decision.reasons.map((reason) => (
            <li key={reason} className="text-xs text-foreground/90">
              {reason}
            </li>
          ))}
        </ul>

        {decision.assumptionFlags.length > 0 ? (
          <div className="flex flex-col gap-1.5 pt-1">
            {decision.assumptionFlags.map((flag) => (
              <AssumptionFlag key={flag} text={flag} />
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Assumption flags: none</span>
        )}

        <div className="pt-1">
          <DecisionTrace data={data} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Operator reviews and executes. FreshRoute does not execute pathways automatically.
      </p>
    </section>
  );
}

function NoFeasiblePathwayCard({ data }: { data: BatchViewData }) {
  const { decision, currentRemainingUsefulLifeHours, batch, context } = data;
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);
  const nextReassessmentIso = addHoursIso(batch.telemetry.capturedAtIso, 1);

  return (
    <section
      aria-labelledby="recommendation-heading"
      className="flex flex-col gap-5 rounded-lg border border-destructive/40 bg-card p-5"
    >
      <div className="flex flex-col gap-2">
        <span
          id="recommendation-heading"
          className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          FreshRoute recommendation
        </span>
        <h2 className="text-2xl leading-none font-semibold tracking-tight text-destructive">No feasible pathway</h2>
        <p className="text-xs text-muted-foreground">
          Current conditions do not satisfy the feasibility constraints for any available recovery pathway.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <MiniField label="Current condition" value={batch.condition} />
        <MiniField
          label="Remaining useful life"
          value={formatHours(currentRemainingUsefulLifeHours)}
          tone="critical"
        />
        <MiniField label="Baseline (current plan)" value={formatIndicativeInr(decision.baselineValue)} />
      </div>

      {/* demandSignal here is never an observed value for a real batch — see
          buildRealDecisionContext.ts: MODERATE is a neutral pricing default
          (multiplier 1.0), not sourced from data.gov.in, which has no
          arrivals/demand column at all (market_price.demand_source is
          always ABSENT). Displaying it as "moderate" would read as an
          observed market fact, so this field states plainly that no demand
          data exists rather than surfacing that default. The real,
          provenance-carrying price is unchanged. */}
      <MiniField
        label="Last known market state"
        value={
          plannedSnapshot
            ? `${formatIndicativeInr(plannedSnapshot.pricePerKg)}/kg — no demand data available`
            : "—"
        }
      />

      <div className="flex flex-col gap-1 border-l-2 border-destructive/40 pl-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Next step</span>
        <span className="text-sm text-foreground">Hold and reassess at the next decision window.</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Next reassessment: {formatTime(nextReassessmentIso)}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Operator reviews and executes. FreshRoute does not execute pathways automatically.
      </p>
    </section>
  );
}

function MiniField({
  label,
  value,
  tone,
  animateKey,
}: {
  label: string;
  value: string;
  tone?: "success" | "critical";
  animateKey?: string;
}) {
  const valueClassName = cn(
    "font-mono text-sm font-medium tabular-nums transition-colors duration-300",
    tone === "success" ? "text-success" : tone === "critical" ? "text-destructive" : "text-foreground",
  );

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
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
