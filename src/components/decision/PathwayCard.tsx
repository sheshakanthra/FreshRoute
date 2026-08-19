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

/** Section 13 — one pathway's row in the ranking: action, evidence, feasibility, expected recovery, cost, risk, rank. */
export function PathwayCard({ candidate }: { candidate: RankedAction }) {
  const isFeasible = candidate.feasible;
  const isAssumptionDependent = candidate.evidenceTier === "PLAUSIBLE_UNVERIFIED";
  const assumptionText =
    isAssumptionDependent && (candidate.action === "REROUTE" || candidate.action === "STORE" || candidate.action === "PROCESS")
      ? ASSUMPTION_FLAG_TEXT[candidate.action]
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        isFeasible ? "border-border bg-card" : "border-border/60 bg-card/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-8 font-mono text-xs text-muted-foreground">
          {candidate.rank > 0 ? `#${candidate.rank}` : "—"}
        </span>

        <span className={cn("w-20 text-sm font-semibold", !isFeasible && "text-muted-foreground")}>
          {candidate.action}
        </span>

        <EvidenceBadge tier={candidate.evidenceTier} />

        {isFeasible ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
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
          <StatusPill tone={RISK_TONE[candidate.riskLevel]}>{candidate.riskLevel}</StatusPill>
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
