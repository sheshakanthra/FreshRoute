"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { appendTelemetryAction } from "@/app/(ops)/batches/actions";

/** Task 4 — telemetry append UI. Each submit writes a new batch_telemetry
 * row and a new condition_assessment row (never mutates the batch); the
 * next recommendation generated for this batch reflects it. */
export function TelemetryForm({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    try {
      const temperatureC = Number(formData.get("temperatureC"));
      const humidityPct = Number(formData.get("humidityPct"));
      if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPct)) {
        throw new Error("Temperature and humidity must be numbers.");
      }
      const { computation } = await appendTelemetryAction({ batchId, temperatureC, humidityPct });
      setMessage(
        `Recorded. Derived condition: ${computation.batchCondition} (quality ${computation.qualityScore.toFixed(0)}/100).`,
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? `Failed: ${e.message}` : "Failed to record reading.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Add telemetry reading</h2>
      <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Temperature (°C)</span>
          <input
            name="temperatureC"
            type="number"
            step="0.1"
            required
            className="h-8 w-28 rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Humidity (%)</span>
          <input
            name="humidityPct"
            type="number"
            step="0.1"
            min={0}
            max={100}
            required
            className="h-8 w-28 rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
          />
        </label>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Recording…" : "Record reading"}
        </Button>
      </form>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
