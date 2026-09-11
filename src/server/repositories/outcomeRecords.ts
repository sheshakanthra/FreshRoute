import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { outcomeRecord } from "@/db/schema";

export interface CreateOutcomeRecordInput {
  batchId: string;
  orgId: string;
  recommendationId: string | null;
  realizedValueInr: number | null;
  realizedLossKg: number | null;
  actualDestination: string | null;
  notes: string | null;
  dataSource: "OPERATOR_REPORTED" | "SYSTEM_INFERRED";
}

export async function createOutcomeRecord(input: CreateOutcomeRecordInput) {
  const rows = await db
    .insert(outcomeRecord)
    .values({
      batchId: input.batchId,
      orgId: input.orgId,
      recommendationId: input.recommendationId,
      realizedValueInr: input.realizedValueInr !== null ? String(input.realizedValueInr) : null,
      realizedLossKg: input.realizedLossKg !== null ? String(input.realizedLossKg) : null,
      actualDestination: input.actualDestination,
      notes: input.notes,
      dataSource: input.dataSource,
    })
    .returning();
  return rows[0];
}

export async function getOutcomeForRecommendation(recommendationId: string) {
  const rows = await db.select().from(outcomeRecord).where(eq(outcomeRecord.recommendationId, recommendationId));
  return rows[0] ?? null;
}
