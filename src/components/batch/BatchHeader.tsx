"use client";

import { AnimatePresence, motion } from "framer-motion";

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

/**
 * Section 10 — batch identity, status, current plan, and the QUALITY / MARKET /
 * LOGISTICS / ECONOMICS summary. This is the page's STATE layer, so it is
 * deliberately the quietest of the three top layers: the four summary groups
 * lost their individual card chrome and now share one container, and the
 * 36-character UUID lost its 2xl display type (first segment at xl, full value
 * on a mono caption line and in the title attribute). Every figure that was
 * here is still here.
 *
 * The status pill is keyed on displayStatus so a real state change — a
 * scenario override pushing the batch into AT_RISK — makes the flag *appear*
 * rather than swap silently. There is no idle motion.
 */
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <h1 className="font-mono text-xl font-semibold tracking-tight" title={batch.id}>
            {batch.id.slice(0, 8)}
          </h1>
          <span className="text-sm text-muted-foreground">
            {batch.commodity} · {formatKg(batch.quantityKg)}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={displayStatus}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="inline-flex"
            >
              <StatusPill tone={STATUS_TONE[displayStatus]}>{STATUS_LABEL[displayStatus]}</StatusPill>
            </motion.span>
          </AnimatePresence>
        </div>

        <p className="font-mono text-[11px] text-muted-foreground">{batch.id}</p>

        <p className="text-xs text-muted-foreground">
          At <span className="text-foreground/90">{batch.currentLocationLabel}</span>
          <span aria-hidden="true"> · </span>
          Current plan:{" "}
          <span className="text-foreground/90">
            {PLAN_VERB[batch.currentPlanAction]} {destinationMarketName}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-card/50 p-4 sm:gap-x-8 lg:grid-cols-4">
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
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
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
