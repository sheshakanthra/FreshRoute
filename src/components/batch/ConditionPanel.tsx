"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { CONDITION_TONE } from "@/components/batch/batchStatus";
import { StatusPill } from "@/components/shared/StatusPill";
import { THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR } from "@/domain/engine";
import { buildTemperatureTrend } from "@/demo/scenarios/telemetryTrend";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatHours } from "@/lib/formatting/number";

/** Section 11 — live condition readings: temperature, humidity, thermal exposure, condition, RUL, with trend + deltas. */
export function ConditionPanel({ data }: { data: BatchViewData }) {
  const { batch, currentRemainingUsefulLifeHours } = data;
  const { telemetry } = batch;
  const trend = buildTemperatureTrend(telemetry.temperatureC);
  const thermalPenaltyHours = telemetry.thermalExposureHours * THERMAL_PENALTY_HOURS_PER_EXPOSURE_HOUR;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Condition</h2>
        <StatusPill tone={CONDITION_TONE[batch.condition]} className="capitalize">
          {batch.condition.toLowerCase()}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Temperature" value={`${telemetry.temperatureC.toFixed(1)}°C`} />
        <Metric label="Humidity" value={`${telemetry.humidityPct.toFixed(0)}%`} />
        <Metric
          label="Thermal exposure"
          value={formatHours(telemetry.thermalExposureHours)}
          delta={telemetry.thermalExposureHours > 0 ? `▲ ${formatHours(telemetry.thermalExposureHours)} since dispatch` : undefined}
        />
        <Metric
          label="Remaining useful life"
          value={formatHours(currentRemainingUsefulLifeHours)}
          delta={thermalPenaltyHours > 0 ? `▼ ${formatHours(thermalPenaltyHours)} from thermal exposure` : undefined}
          negative={currentRemainingUsefulLifeHours <= 0}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Temperature trend
        </span>
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Line
                type="monotone"
                dataKey="temperatureC"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const isLast = props.index === trend.length - 1;
                  if (!isLast) return <g key={`dot-${props.index}`} />;
                  return (
                    <circle
                      key={`dot-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="var(--primary)"
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  negative,
}: {
  label: string;
  value: string;
  delta?: string;
  negative?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={negative ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-foreground"}>
        {value}
      </span>
      {delta && <span className="text-[11px] text-muted-foreground">{delta}</span>}
    </div>
  );
}
