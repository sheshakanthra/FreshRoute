// Live-database-backed page: never statically prerendered at build time.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchWorkspace } from "@/components/batch/BatchWorkspace";
import { getBatch } from "@/server/repositories/batches";
import { buildRealBatchBaseline } from "@/server/context/buildRealBatchBaseline";
import { getLatestRecommendation } from "@/server/repositories/recommendations";
import { listActionTypes } from "@/server/repositories/actionTypes";
import { getOutcomeForRecommendation } from "@/server/repositories/outcomeRecords";
import type { RecoveryAction } from "@/domain/types";

export default async function BatchDetailPage({ params }: PageProps<"/batches/[id]">) {
  const { id } = await params;

  const batchRow = await getBatch(id);
  if (!batchRow) notFound();

  const baseline = await buildRealBatchBaseline(id);
  if (!baseline) notFound();

  const [latestRecommendation, actionTypeRows] = await Promise.all([
    getLatestRecommendation(id),
    listActionTypes(),
  ]);
  const outcome = latestRecommendation ? await getOutcomeForRecommendation(latestRecommendation.id) : null;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link href="/dashboard" className="w-fit text-xs text-muted-foreground hover:text-foreground">
        ← Back to Operations Center
      </Link>

      <BatchWorkspace
        baseline={baseline}
        persistedRecommendation={
          latestRecommendation
            ? {
                id: latestRecommendation.id,
                chosenActionCode: latestRecommendation.chosenActionCode as RecoveryAction | null,
                status: latestRecommendation.status,
                validUntil: latestRecommendation.validUntil.toISOString(),
                generatedAt: latestRecommendation.generatedAt.toISOString(),
                expectedRecoverableValueInr: latestRecommendation.expectedRecoverableValueInr,
                confidence: latestRecommendation.confidence,
                modelledUpliftInr: latestRecommendation.modelledUpliftInr,
                reasons: (latestRecommendation.reasons as string[] | null) ?? [],
              }
            : null
        }
        actionTypes={actionTypeRows.map((a) => ({ code: a.code as RecoveryAction, name: a.name, evidenceTier: a.evidenceTier }))}
        outcome={
          outcome
            ? {
                id: outcome.id,
                realizedValueInr: outcome.realizedValueInr,
                realizedLossKg: outcome.realizedLossKg,
                actualDestination: outcome.actualDestination,
                notes: outcome.notes,
              }
            : null
        }
      />
    </div>
  );
}
