import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours, formatKg } from "@/lib/formatting/number";

/** Section 10 — route, timing and cost detail behind the header's compact LOGISTICS summary. */
export function LogisticsPanel({ data }: { data: BatchViewData }) {
  const { batch, context, destinationMarketName } = data;
  const plannedMarket = context.markets.find((m) => m.id === batch.plannedMarketId);
  const totalEtaHours = plannedMarket ? plannedMarket.etaHours + batch.transitDelayHours : null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Logistics</h2>

      <div className="flex flex-col gap-3 text-sm">
        <Row label="Route" value={`${batch.currentLocationLabel} → ${destinationMarketName}`} />
        <Row label="Transit ETA" value={totalEtaHours !== null ? formatHours(totalEtaHours) : "—"} />
        <Row label="Transit delay" value={formatHours(batch.transitDelayHours)} highlight={batch.transitDelayHours > 0} />
        <Row label="Thermal exposure" value={formatHours(batch.telemetry.thermalExposureHours)} highlight={batch.telemetry.thermalExposureHours > 0} />
        <Row
          label="Transit cost"
          value={plannedMarket ? `${formatIndicativeInr(plannedMarket.transitCostPerKg)}/kg` : "—"}
        />
        <Row label="Quantity in transit" value={formatKg(batch.quantityKg)} />
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-medium text-warning" : "font-medium text-foreground"}>{value}</span>
    </div>
  );
}
