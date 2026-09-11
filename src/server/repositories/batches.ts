import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { batch } from "@/db/schema";

export async function listBatches(orgId: string) {
  return db.select().from(batch).where(eq(batch.orgId, orgId)).orderBy(desc(batch.createdAt));
}

export async function getBatch(id: string) {
  const rows = await db.select().from(batch).where(eq(batch.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface CreateBatchInput {
  orgId: string;
  commodityId: string;
  plannedMarketId: string;
  quantityKg: number;
  variety?: string | null;
  origin?: string | null;
  currentLocation?: string | null;
  costBasisInr?: number | null;
}

export async function createBatch(input: CreateBatchInput) {
  const rows = await db
    .insert(batch)
    .values({
      orgId: input.orgId,
      commodityId: input.commodityId,
      plannedMarketId: input.plannedMarketId,
      quantityKg: String(input.quantityKg),
      variety: input.variety ?? null,
      origin: input.origin ?? null,
      currentLocation: input.currentLocation ?? null,
      costBasisInr: input.costBasisInr !== null && input.costBasisInr !== undefined ? String(input.costBasisInr) : null,
      status: "ACTIVE",
    })
    .returning();
  return rows[0];
}
