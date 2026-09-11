"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EvidenceBadge } from "@/components/shared/EvidenceBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import {
  acceptRecommendationAction,
  overrideRecommendationAction,
  recordOutcomeAction,
  rejectRecommendationAction,
} from "@/app/(ops)/batches/outcomeActions";
import { formatIndicativeInr, formatSignedIndicativeInr } from "@/lib/formatting/currency";
import type { EvidenceTier, RecoveryAction } from "@/domain/types";

export interface PersistedRecommendation {
  id: string;
  chosenActionCode: RecoveryAction | null;
  status: "ISSUED" | "ACCEPTED" | "REJECTED" | "OVERRIDDEN" | "EXPIRED";
  validUntil: string; // ISO
  generatedAt: string; // ISO
  expectedRecoverableValueInr: string;
  confidence: string | null;
  modelledUpliftInr: string;
  reasons: string[];
}

export interface ActionTypeOption {
  code: RecoveryAction;
  name: string;
  evidenceTier: EvidenceTier;
}

export interface PersistedOutcome {
  id: string;
  realizedValueInr: string | null;
  realizedLossKg: string | null;
  actualDestination: string | null;
  notes: string | null;
}

const STATUS_TONE: Record<PersistedRecommendation["status"], "success" | "warning" | "critical" | "info" | "neutral"> = {
  ISSUED: "info",
  ACCEPTED: "success",
  REJECTED: "critical",
  OVERRIDDEN: "warning",
  EXPIRED: "neutral",
};

/**
 * D4 — operates on the PERSISTED recommendation row (recommendation.status),
 * not the live scenario-preview decision RecommendationCard renders above
 * it. Those can differ if the operator has moved a scenario slider since
 * the last "Generate recommendation" — this panel always reflects exactly
 * what's in the database, and independently shows the evidence tier for
 * the persisted chosen action so that's correct regardless of what the
 * live preview above happens to be showing (task 6).
 */
export function RecommendationExecutionPanel({
  batchId,
  recommendation,
  actionTypes,
  outcome,
}: {
  batchId: string;
  recommendation: PersistedRecommendation | null;
  actionTypes: ActionTypeOption[];
  outcome: PersistedOutcome | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showOverridePicker, setShowOverridePicker] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  if (!recommendation) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        No recommendation has been persisted for this batch yet — use &ldquo;Generate recommendation&rdquo; above.
      </div>
    );
  }

  const chosenActionType = recommendation.chosenActionCode
    ? actionTypes.find((a) => a.code === recommendation.chosenActionCode)
    : undefined;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? `Failed: ${e.message}` : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Persisted recommendation</h2>
        <StatusPill tone={STATUS_TONE[recommendation.status]}>{recommendation.status}</StatusPill>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span>
          Chosen action: <span className="font-medium text-foreground">{recommendation.chosenActionCode ?? "None (no feasible pathway)"}</span>
        </span>
        <span>Expected recoverable value: {formatIndicativeInr(Number(recommendation.expectedRecoverableValueInr))}</span>
        <span>Expected avoided loss vs. current plan: {formatSignedIndicativeInr(Number(recommendation.modelledUpliftInr))}</span>
        <span>Valid until: {new Date(recommendation.validUntil).toLocaleString()}</span>
      </div>

      {recommendation.confidence !== null && (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2.5 text-xs">
          <span className="font-medium text-foreground">
            Confidence: {Number(recommendation.confidence).toFixed(2)}{" "}
            <span className="font-normal text-muted-foreground">— rule-based, not a calibrated probability</span>
          </span>
          {recommendation.reasons.length > 0 && (
            <ul className="flex flex-col gap-1">
              {recommendation.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-muted-foreground">
                  <span aria-hidden="true">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {chosenActionType && chosenActionType.evidenceTier === "PLAUSIBLE_UNVERIFIED" && (
        <div className="flex flex-col gap-1.5 rounded-md border border-warning/40 bg-warning/10 p-2.5">
          <div className="flex items-center gap-2">
            <EvidenceBadge tier="PLAUSIBLE_UNVERIFIED" />
            <span className="text-xs font-medium text-warning">Before you accept this</span>
          </div>
          <p className="text-xs text-warning">
            {chosenActionType.name} is plausible but not field-verified — it has not been confirmed to work in practice.
            Accepting it executes an unverified pathway.
          </p>
        </div>
      )}

      {recommendation.status === "ISSUED" && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !recommendation.chosenActionCode}
            onClick={() => run(() => acceptRecommendationAction({ recommendationId: recommendation.id, batchId }))}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => rejectRecommendationAction({ recommendationId: recommendation.id, batchId }))}
          >
            Reject
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowOverridePicker((v) => !v)}>
            Override
          </Button>
        </div>
      )}

      {recommendation.status === "ISSUED" && !recommendation.chosenActionCode && (
        <p className="text-xs text-muted-foreground">No feasible pathway — nothing to Accept. Reject or Override are still available.</p>
      )}

      {showOverridePicker && (
        <form
          className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
          action={(formData: FormData) =>
            run(() =>
              overrideRecommendationAction({
                recommendationId: recommendation.id,
                batchId,
                executedActionCode: String(formData.get("executedActionCode")) as RecoveryAction,
                notes: String(formData.get("notes") ?? "") || undefined,
              }),
            )
          }
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">What was actually done? (required — from action_type)</span>
            <select
              name="executedActionCode"
              required
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none"
            >
              {actionTypes.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name} ({a.evidenceTier})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Notes</span>
            <input name="notes" type="text" className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none" />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            Confirm override
          </Button>
        </form>
      )}

      {(recommendation.status === "ACCEPTED" || recommendation.status === "OVERRIDDEN") &&
        (outcome ? (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2.5 text-xs">
            <span className="font-medium text-foreground">Outcome recorded</span>
            <span className="text-muted-foreground">
              Realized value: {outcome.realizedValueInr ? formatIndicativeInr(Number(outcome.realizedValueInr)) : "—"} · Loss:{" "}
              {outcome.realizedLossKg ?? "—"} kg · Destination: {outcome.actualDestination ?? "—"}
            </span>
            {outcome.notes && <span className="text-muted-foreground">{outcome.notes}</span>}
          </div>
        ) : showOutcomeForm ? (
          <form
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
            action={(formData: FormData) =>
              run(() =>
                recordOutcomeAction({
                  recommendationId: recommendation.id,
                  batchId,
                  realizedValueInr: formData.get("realizedValueInr") ? Number(formData.get("realizedValueInr")) : null,
                  realizedLossKg: formData.get("realizedLossKg") ? Number(formData.get("realizedLossKg")) : null,
                  actualDestination: String(formData.get("actualDestination") ?? "") || null,
                  notes: String(formData.get("notes") ?? "") || null,
                }),
              )
            }
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Realized value (₹)</span>
              <input name="realizedValueInr" type="number" step="0.01" className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Realized loss (kg)</span>
              <input name="realizedLossKg" type="number" step="0.01" className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Actual destination</span>
              <input name="actualDestination" type="text" className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <input name="notes" type="text" className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none" />
            </label>
            <Button type="submit" size="sm" disabled={busy}>
              Save outcome
            </Button>
          </form>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowOutcomeForm(true)}>
            Record outcome
          </Button>
        ))}

      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
