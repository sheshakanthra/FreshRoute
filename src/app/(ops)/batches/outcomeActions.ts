"use server";

import { revalidatePath } from "next/cache";
import { getDefaultOrganization } from "@/server/repositories/organizations";
import { acceptRecommendation, overrideRecommendation, rejectRecommendation } from "@/server/services/executionService";
import { recordOutcomeForRecommendation } from "@/server/services/outcomeService";
import type { RecoveryAction } from "@/domain/types";

/** Task 1/2/3 — Accept. */
export async function acceptRecommendationAction(input: { recommendationId: string; batchId: string; notes?: string }) {
  const org = await getDefaultOrganization();
  const result = await acceptRecommendation(input.recommendationId, org.id, input.notes);
  revalidatePath(`/batches/${input.batchId}`);
  revalidatePath("/decisions");
  return result;
}

/** Task 1/2/3 — Reject. */
export async function rejectRecommendationAction(input: { recommendationId: string; batchId: string; notes?: string }) {
  const result = await rejectRecommendation(input.recommendationId, input.notes);
  revalidatePath(`/batches/${input.batchId}`);
  revalidatePath("/decisions");
  return result;
}

/** Task 1/2/3 — Override: executedActionCode must be a real action_type.code. */
export async function overrideRecommendationAction(input: {
  recommendationId: string;
  batchId: string;
  executedActionCode: RecoveryAction;
  notes?: string;
}) {
  const org = await getDefaultOrganization();
  const result = await overrideRecommendation(input.recommendationId, org.id, input.executedActionCode, input.notes);
  revalidatePath(`/batches/${input.batchId}`);
  revalidatePath("/decisions");
  return result;
}

/** Task 4 — outcome-recording form. */
export async function recordOutcomeAction(input: {
  recommendationId: string;
  batchId: string;
  realizedValueInr: number | null;
  realizedLossKg: number | null;
  actualDestination: string | null;
  notes: string | null;
}) {
  const org = await getDefaultOrganization();
  const result = await recordOutcomeForRecommendation({
    recommendationId: input.recommendationId,
    batchId: input.batchId,
    orgId: org.id,
    realizedValueInr: input.realizedValueInr,
    realizedLossKg: input.realizedLossKg,
    actualDestination: input.actualDestination,
    notes: input.notes,
  });
  revalidatePath(`/batches/${input.batchId}`);
  return result;
}
