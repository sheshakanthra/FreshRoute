import "server-only";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { batchTelemetry } from "@/db/schema";

export async function listTelemetry(batchId: string) {
  return db
    .select()
    .from(batchTelemetry)
    .where(eq(batchTelemetry.batchId, batchId))
    .orderBy(desc(batchTelemetry.recordedAt));
}

export interface AppendTelemetryInput {
  batchId: string;
  orgId: string;
  temperatureC: number;
  humidityPct: number;
  recordedAt?: Date;
  sensorId?: string | null;
  dataSource?: "OBSERVED" | "SIMULATED" | "USER_REPORTED";
}

/** Append-only by design (DB trigger rejects UPDATE/DELETE on this table —
 * see drizzle/0001_telemetry_append_only_trigger.sql). This function only
 * ever inserts. */
export async function appendTelemetry(input: AppendTelemetryInput) {
  const recordedAt = input.recordedAt ?? new Date();
  const rows = await db
    .insert(batchTelemetry)
    .values({
      batchId: input.batchId,
      orgId: input.orgId,
      recordedAt,
      temperatureC: String(input.temperatureC),
      humidityPct: String(input.humidityPct),
      sensorId: input.sensorId ?? null,
      dataSource: input.dataSource ?? "USER_REPORTED",
      dedupeKey: randomUUID(),
    })
    .returning();
  return rows[0];
}
