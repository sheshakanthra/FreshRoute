"use client";

import { useMemo, useState } from "react";

import { BatchHeader } from "@/components/batch/BatchHeader";
import { ConditionPanel } from "@/components/batch/ConditionPanel";
import { LogisticsPanel } from "@/components/batch/LogisticsPanel";
import { DecisionEngine } from "@/components/decision/DecisionEngine";
import { EventTimeline } from "@/components/decision/EventTimeline";
import { RecommendationCard } from "@/components/decision/RecommendationCard";
import { ScenarioDrawer } from "@/components/decision/ScenarioDrawer";
import { MarketPanel } from "@/components/market/MarketPanel";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { batches } from "@/demo/data/batches";
import { markets } from "@/demo/data/markets";
import { buildDecisionContext, deriveCurrentStateScenario } from "@/demo/scenarios/buildContext";
import { getCandidatePaths } from "@/demo/scenarios/candidatePaths";
import { computeDisplayStatus } from "@/demo/scenarios/displayStatus";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { computeCurrentRemainingUsefulLifeHours, evaluateDecision } from "@/domain/engine";
import type { Scenario } from "@/domain/types";

/**
 * Section 19 — owns the single scenario state for this batch's workspace.
 * Every downstream panel receives the same freshly computed BatchViewData,
 * so a slider change flows through the real engine to the whole page.
 */
export function BatchWorkspace({ batchId }: { batchId: string }) {
  const batch = useMemo(() => batches.find((b) => b.id === batchId), [batchId]);
  const [scenario, setScenario] = useState<Scenario>(() =>
    batch ? deriveCurrentStateScenario(batch) : deriveCurrentStateScenario(batches[0]),
  );

  const data = useMemo<BatchViewData | undefined>(() => {
    if (!batch) return undefined;

    const context = buildDecisionContext(batch, scenario);
    const decision = evaluateDecision(context);
    const candidates = getCandidatePaths(context);
    const currentRemainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(
      scenario.batchCondition,
      scenario.thermalExposureHours,
    );
    const destinationMarket = markets.find((m) => m.id === batch.plannedMarketId);

    return {
      batch: context.batch,
      context,
      decision,
      candidates,
      currentRemainingUsefulLifeHours,
      destinationMarketName: destinationMarket?.name ?? "Unknown market",
      displayStatus: computeDisplayStatus(context.batch, decision),
    };
  }, [batch, scenario]);

  if (!batch || !data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BatchHeader data={data} />
        <ScenarioDrawer scenario={scenario} onScenarioChange={setScenario} />
      </div>

      <DemoBanner />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ConditionPanel data={data} />
            <LogisticsPanel data={data} />
          </div>

          <MarketPanel data={data} />

          <div id="decision-engine-panel">
            <DecisionEngine decision={data.decision} />
          </div>

          <EventTimeline activeScenarioId={scenario.id} onScenarioChange={setScenario} />
        </div>

        <div id="recommendation-card" className="xl:sticky xl:top-6 xl:self-start">
          <RecommendationCard data={data} />
        </div>
      </div>
    </div>
  );
}
