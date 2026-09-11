import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { actionExecution } from "@/db/schema";
import type { RecoveryAction } from "@/domain/types";

export interface CreateActionExecutionInput {
  recommendationId: string;
  orgId: string;
  executedActionCode: RecoveryAction;
  executedBy: string;
  notes?: string | null;
}

export async function createActionExecution(input: CreateActionExecutionInput) {
  const rows = await db
    .insert(actionExecution)
    .values({
      recommendationId: input.recommendationId,
      orgId: input.orgId,
      executedActionCode: input.executedActionCode,
      executedBy: input.executedBy,
      notes: input.notes ?? null,
    })
    .returning();
  return rows[0];
}

export async function listExecutionsForRecommendation(recommendationId: string) {
  return db.select().from(actionExecution).where(eq(actionExecution.recommendationId, recommendationId));
}
