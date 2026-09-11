import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { conditionAssessment } from "@/db/schema";

export async function getLatestConditionAssessment(batchId: string) {
  const rows = await db
    .select()
    .from(conditionAssessment)
    .where(eq(conditionAssessment.batchId, batchId))
    .orderBy(desc(conditionAssessment.computedAt))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateConditionAssessmentInput {
  batchId: string;
  orgId: string;
  qualityScore: number;
  decayPointsPerHour: number;
  remainingUsefulLifeHours: number;
  modelName: string;
  modelVersion: string;
  inputSnapshot: unknown;
}

export async function createConditionAssessment(input: CreateConditionAssessmentInput) {
  const rows = await db
    .insert(conditionAssessment)
    .values({
      batchId: input.batchId,
      orgId: input.orgId,
      qualityScore: String(input.qualityScore),
      decayPointsPerHour: String(input.decayPointsPerHour),
      remainingUsefulLifeHours: String(input.remainingUsefulLifeHours),
      modelName: input.modelName,
      modelVersion: input.modelVersion,
      inputSnapshot: input.inputSnapshot,
    })
    .returning();
  return rows[0];
}
