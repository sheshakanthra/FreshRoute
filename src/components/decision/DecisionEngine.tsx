import { RankingList } from "@/components/decision/RankingList";
import type { DecisionResult } from "@/domain/types";

/** Section 13 — the centerpiece panel comparing all six candidate pathways on one economic scale. */
export function DecisionEngine({ decision }: { decision: DecisionResult }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Value recovery engine</h2>
        <p className="text-xs text-muted-foreground">Comparing feasible pathways on one economic scale.</p>
      </div>

      <RankingList candidates={decision.rankedCandidates} />
    </div>
  );
}
