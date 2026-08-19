import { CONDITION_TONE, STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import { StatusPill } from "@/components/shared/StatusPill";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import type { RecoveryAction } from "@/domain/types";
import { formatIndicativeInr } from "@/lib/formatting/currency";
import { formatHours, formatKg } from "@/lib/formatting/number";

const PLAN_VERB: Record<RecoveryAction, string> = {
  SELL: "Sell to",
  DISCOUNT: "Discount-sell at",
  DIVERT: "Divert to",
  REROUTE: "Reroute to",
  STORE: "Store at",
  PROCESS: "Process at",
};

/** Section 10 — batch identity, status, current plan, and the QUALITY / MARKET / LOGISTICS / ECONOMICS summary row. */
export function BatchHeader({ data }: { data: BatchViewData }) {
  const { batch, context, decision, currentRemainingUsefulLifeHours, destinationMarketName, displayStatus } = data;

  const plannedMarket = context.markets.find((m) => m.id === batch.plannedMarketId);
  const plannedSnapshot = context.marketSnapshots.find((s) => s.marketId === batch.plannedMarketId);
  const alternateMarket = context.markets.find((m) => m.id !== batch.plannedMarketId);
  const alternateSnapshot = alternateMarket
    ? context.marketSnapshots.find((s) => s.marketId === alternateMarket.id)
    : undefined;

  const feasibleValues = decision.rankedCandidates.filter((c) => c.feasible).map((c) => c.expectedRecovery);
  const recoveryRange =
    feasibleValues.length > 0
      ? `${formatIndicativeInr(Math.min(...feasibleValues))} – ${formatIndicativeInr(Math.max(...feasibleValues))}`
      : "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{batch.id}</h1>
          <span className="text-lg text-foreground/90">{batch.commodity}</span>
          <span className="text-lg text-muted-foreground">{formatKg(batch.quantityKg)}</span>
          <StatusPill tone={STATUS_TONE[displayStatus]}>{STATUS_LABEL[displayStatus]}</StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">
          Current location: <span className="text-foreground">{batch.currentLocationLabel}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Current plan:{" "}
          <span className="text-foreground">
            {PLAN_VERB[batch.currentPlanAction]} {destinationMarketName}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryColumn label="Quality">
          <SummaryRow label="Remaining useful life" value={formatHours(currentRemainingUsefulLifeHours)} />
          <SummaryRow
            label="Current condition"
            value={
              <StatusPill tone={CONDITION_TONE[batch.condition]} className="w-fit capitalize">
                {batch.condition.toLowerCase()}
              </StatusPill>
            }
          />
        </SummaryColumn>

        <SummaryColumn label="Market">
          <SummaryRow
            label="Current market price"
            value={plannedSnapshot ? `${formatIndicativeInr(plannedSnapshot.pricePerKg)}/kg` : "—"}
          />
          <SummaryRow
            label="Alternative market signal"
            value={
              alternateMarket && alternateSnapshot
                ? `${alternateMarket.name}: ${formatIndicativeInr(alternateSnapshot.pricePerKg)}/kg, ${alternateSnapshot.demandSignal.toLowerCase()}`
                : "No alternate market"
            }
          />
        </SummaryColumn>

        <SummaryColumn label="Logistics">
          <SummaryRow
            label="ETA"
            value={plannedMarket ? formatHours(plannedMarket.etaHours + batch.transitDelayHours) : "—"}
          />
          <SummaryRow label="Delay" value={formatHours(batch.transitDelayHours)} />
          <SummaryRow label="Exposure" value={formatHours(batch.telemetry.thermalExposureHours)} />
        </SummaryColumn>

        <SummaryColumn label="Economics">
          <SummaryRow label="Current expected recovery" value={formatIndicativeInr(decision.baselineValue)} />
          <SummaryRow label="Potential recovery range" value={recoveryRange} />
        </SummaryColumn>
      </div>
    </div>
  );
}

function SummaryColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
