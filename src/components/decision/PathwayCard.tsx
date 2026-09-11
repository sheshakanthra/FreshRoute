import { CheckCircle2, XCircle } from "lucide-react";

import { AssumptionFlag } from "@/components/shared/AssumptionFlag";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { ASSUMPTION_FLAG_TEXT } from "@/domain/engine";
import type { RankedAction, RiskLevel } from "@/domain/types";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

const RISK_TONE: Record<RiskLevel, "success" | "warning" | "critical"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "critical",
};

/**
 * Section 13 — one pathway's row in the ranking: action, evidence,
 * feasibility, expected recovery, cost, risk, rank.
 *
 * Feasible-vs-infeasible is now readable without reading any text, and the
 * work is done by the losers going quiet rather than the winner shouting:
 * the "Feasible" marker dropped to muted (it is the normal case, on four or
 * five of six rows), leaving the destructive "Infeasible" marks as the only
 * coloured feasibility signals in the list. Infeasible rows also strike
 * through their action name — a shape carrier, so the de-emphasis does not
 * depend on colour — and drop to muted figures. Deliberately NOT done with
 * `opacity`: a 55% muted-foreground over --card measures 2.8:1 and would put
 * the infeasible reasons below WCAG AA.
 *
 * The rank-1 feasible row gets a thin primary edge and a 6% tint. Its
 * infeasibility reason, evidence tier and assumption flags are untouched on
 * every row.
 */
export function PathwayCard({ candidate }: { candidate: RankedAction }) {
  const isFeasible = candidate.feasible;
  const isWinner = isFeasible && candidate.rank === 1;
  const isAssumptionDependent = candidate.evidenceTier === "PLAUSIBLE_UNVERIFIED";
  const assumptionText =
    isAssumptionDependent && (candidate.action === "REROUTE" || candidate.action === "STORE" || candidate.action === "PROCESS")
      ? ASSUMPTION_FLAG_TEXT[candidate.action]
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 transition-colors duration-300",
        isWinner
          ? "border-primary/40 bg-primary/[0.06]"
          : isFeasible
            ? "border-border bg-card"
            : "border-border/50 bg-card/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "w-8 font-mono text-xs tabular-nums",
            isWinner ? "font-semibold text-primary" : "text-muted-foreground",
          )}
        >
          {candidate.rank > 0 ? `#${candidate.rank}` : "—"}
        </span>

        <span
          className={cn(
            "w-20 text-sm font-semibold",
            isFeasible ? "text-foreground" : "text-muted-foreground line-through decoration-1",
          )}
        >
          {candidate.action}
        </span>

        <EvidenceBadge tier={candidate.evidenceTier} />

        {isFeasible ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Feasible{isAssumptionDependent ? "*" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <XCircle className="size-3.5" aria-hidden="true" />
            Infeasible
          </span>
        )}

        <div className="ml-auto flex items-center gap-4">
          <Figure label="Expected recovery" value={formatIndicativeInr(candidate.expectedRecovery)} muted={!isFeasible} />
          <Figure label="Cost" value={formatIndicativeInr(candidate.cost)} muted={!isFeasible} />
          {/* Risk level is moot on a pathway that cannot execute — showing
              e.g. "LOW" on an infeasible row reads as an assessed risk
              rating, which it isn't. Neutral "—" for infeasible rows;
              engine output (candidate.riskLevel) is untouched either way. */}
          <StatusPill tone={isFeasible ? RISK_TONE[candidate.riskLevel] : "neutral"}>
            {isFeasible ? candidate.riskLevel : "—"}
          </StatusPill>
        </div>
      </div>

      {!isFeasible && candidate.feasibilityReason && (
        <p className="pl-11 text-xs text-muted-foreground">{candidate.feasibilityReason}</p>
      )}

      {isFeasible && assumptionText && <AssumptionFlag text={assumptionText} className="ml-11" />}
    </div>
  );
}

function Figure({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
