import "server-only";
import { appendTelemetry } from "../repositories/telemetry";
import { listTelemetry } from "../repositories/telemetry";
import { createConditionAssessment } from "../repositories/conditionAssessments";
import { getBatch } from "../repositories/batches";
import { getCommodityByCode } from "../repositories/commodities";
import { computeConditionAssessment } from "../assessment/computeConditionAssessment";

/**
 * Task 4: adding a reading writes a new batch_telemetry row (append-only,
 * enforced by the DB trigger) AND a new condition_assessment row derived
 * from the full telemetry history to date — never mutates the batch row
 * itself. The next recommendation generated for this batch will pick up
 * the new condition_assessment automatically via buildRealBatchBaseline.
 */
export async function recordTelemetryReading(input: {
  batchId: string;
  orgId: string;
  temperatureC: number;
  humidityPct: number;
}) {
  const batchRow = await getBatch(input.batchId);
  if (!batchRow) throw new Error(`Batch ${input.batchId} not found`);

  const reading = await appendTelemetry({
    batchId: input.batchId,
    orgId: input.orgId,
    temperatureC: input.temperatureC,
    humidityPct: input.humidityPct,
    dataSource: "USER_REPORTED",
  });

  const commodity = await getCommodityByCode("TOMATO");
  const allReadings = await listTelemetry(input.batchId);

  const computation = computeConditionAssessment(
    allReadings.map((r) => ({
      recordedAt: r.recordedAt,
      temperatureC: r.temperatureC !== null ? Number(r.temperatureC) : null,
    })),
    {
      optimalTempC: commodity?.optimalTempC !== null && commodity?.optimalTempC !== undefined ? Number(commodity.optimalTempC) : null,
      chillingThresholdC: commodity?.chillingThresholdC !== null && commodity?.chillingThresholdC !== undefined ? Number(commodity.chillingThresholdC) : null,
      baseDecayPointsPerHour: commodity?.baseDecayPointsPerHour !== null && commodity?.baseDecayPointsPerHour !== undefined ? Number(commodity.baseDecayPointsPerHour) : null,
      q10: commodity?.q10 !== null && commodity?.q10 !== undefined ? Number(commodity.q10) : null,
    },
  );

  const assessment = await createConditionAssessment({
    batchId: input.batchId,
    orgId: input.orgId,
    qualityScore: computation.qualityScore,
    decayPointsPerHour: computation.decayPointsPerHour,
    remainingUsefulLifeHours: computation.remainingUsefulLifeHours,
    modelName: computation.modelName,
    modelVersion: computation.modelVersion,
    inputSnapshot: computation.inputSnapshot,
  });

  return { reading, assessment, computation };
}
