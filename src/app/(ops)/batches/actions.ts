"use server";

import { revalidatePath } from "next/cache";
import { getDefaultOrganization } from "@/server/repositories/organizations";
import { getCommodityByCode } from "@/server/repositories/commodities";
import { createBatch } from "@/server/repositories/batches";
import { recordTelemetryReading } from "@/server/services/telemetryService";
import { generateAndPersistRecommendation } from "@/server/services/recommendationService";
import type { Scenario } from "@/domain/types";

/** Task 3 — batch CRUD: create. */
export async function createBatchAction(input: {
  quantityKg: number;
  variety?: string;
  plannedMarketId: string;
  origin?: string;
  currentLocation?: string;
}) {
  const org = await getDefaultOrganization();
  const commodity = await getCommodityByCode("TOMATO"); // only commodity with real data today
  if (!commodity) throw new Error("TOMATO commodity is not seeded — run scripts/db/seed.ts");

  const created = await createBatch({
    orgId: org.id,
    commodityId: commodity.id,
    plannedMarketId: input.plannedMarketId,
    quantityKg: input.quantityKg,
    variety: input.variety ?? null,
    origin: input.origin ?? null,
    currentLocation: input.currentLocation ?? input.origin ?? null,
  });

  revalidatePath("/batches");
  revalidatePath("/dashboard");
  return created;
}

/** Task 4 — telemetry append endpoint. */
export async function appendTelemetryAction(input: { batchId: string; temperatureC: number; humidityPct: number }) {
  const org = await getDefaultOrganization();
  const result = await recordTelemetryReading({
    batchId: input.batchId,
    orgId: org.id,
    temperatureC: input.temperatureC,
    humidityPct: input.humidityPct,
  });
  revalidatePath(`/batches/${input.batchId}`);
  revalidatePath("/batches");
  revalidatePath("/dashboard");
  return result;
}

/** Task 5 — generate + persist a recommendation (row + every candidate). */
export async function generateRecommendationAction(input: { batchId: string; scenario?: Partial<Scenario> }) {
  const org = await getDefaultOrganization();
  const result = await generateAndPersistRecommendation(input.batchId, org.id, input.scenario);
  revalidatePath(`/batches/${input.batchId}`);
  revalidatePath("/decisions");
  return result;
}
