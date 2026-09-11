"use client";

import { useMemo, useState, useTransition } from "react";
import { MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";

import { BatchHeader } from "@/components/batch/BatchHeader";
import { EconomicRiskPanel } from "@/components/batch/EconomicRiskPanel";
import { ConditionPanel } from "@/components/batch/ConditionPanel";
import { LogisticsPanel } from "@/components/batch/LogisticsPanel";
import { TelemetryForm } from "@/components/batch/TelemetryForm";
import { DecisionEngine } from "@/components/decision/DecisionEngine";
import { EventTimeline } from "@/components/decision/EventTimeline";
import { RecommendationCard } from "@/components/decision/RecommendationCard";
import {
  RecommendationExecutionPanel,
  type ActionTypeOption,
  type PersistedOutcome,
  type PersistedRecommendation,
} from "@/components/decision/RecommendationExecutionPanel";
import { ScenarioDrawer } from "@/components/decision/ScenarioDrawer";
import { MarketPanel } from "@/components/market/MarketPanel";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { Button } from "@/components/ui/button";
import { generateRecommendationAction } from "@/app/(ops)/batches/actions";
import {
  buildRealDecisionContext,
  deriveBaselineScenario,
  type RealBatchBaseline,
} from "@/domain-adapters/buildRealDecisionContext";
import { getAllCandidatePaths } from "@/domain-adapters/getAllCandidatePaths";
import { computeDisplayStatus } from "@/demo/scenarios/displayStatus";
import type { BatchViewData } from "@/demo/scenarios/batchViewData";
import { computeCurrentRemainingUsefulLifeHours, evaluateDecision } from "@/domain/engine";
import type { Scenario } from "@/domain/types";

/**
 * D3 — owns the single scenario state for this batch's workspace, same
 * pattern as before: every scenario change flows through the UNCHANGED
 * evaluateDecision() and re-renders every panel. The only thing that
 * changed is where the "baseline" (pre-scenario-override) data comes from —
 * a RealBatchBaseline assembled server-side from Postgres, not a lookup
 * into a hardcoded demo array.
 */
export function BatchWorkspace({
  baseline,
  persistedRecommendation,
  actionTypes,
  outcome,
}: {
  baseline: RealBatchBaseline;
  persistedRecommendation: PersistedRecommendation | null;
  actionTypes: ActionTypeOption[];
  outcome: PersistedOutcome | null;
}) {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>(() => deriveBaselineScenario(baseline));
  const [isPersisting, startPersist] = useTransition();
  const [persistMessage, setPersistMessage] = useState<string | null>(null);

  const data = useMemo<BatchViewData>(() => {
    const context = buildRealDecisionContext(baseline, scenario);
    const decision = evaluateDecision(context);
    const candidates = getAllCandidatePaths(context);
    const currentRemainingUsefulLifeHours = computeCurrentRemainingUsefulLifeHours(
      scenario.batchCondition,
      scenario.thermalExposureHours,
    );
    const destinationMarket = context.markets.find((m) => m.id === baseline.plannedMarketId);

    return {
      batch: context.batch,
      context,
      decision,
      candidates,
      currentRemainingUsefulLifeHours,
      qualityScore: baseline.qualityScore,
      destinationMarketName: destinationMarket?.name ?? "Unknown market",
      displayStatus: computeDisplayStatus(context.batch, decision),
    };
  }, [baseline, scenario]);

  function handleGenerateRecommendation() {
    setPersistMessage(null);
    startPersist(async () => {
      try {
        await generateRecommendationAction({ batchId: baseline.batchId, scenario });
        setPersistMessage("Recommendation persisted to the database.");
        router.refresh();
      } catch (e) {
        setPersistMessage(e instanceof Error ? `Failed: ${e.message}` : "Failed to persist recommendation.");
      }
    });
  }

  return (
    // Section 8 — every framer-motion transition in this subtree is disabled
    // for anyone whose OS asks for reduced motion; the CSS transitions are
    // covered by the prefers-reduced-motion block in globals.css.
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BatchHeader data={data} />
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ScenarioDrawer scenario={scenario} onScenarioChange={setScenario} />
            <Button size="sm" onClick={handleGenerateRecommendation} disabled={isPersisting}>
              {isPersisting ? "Persisting…" : "Generate recommendation"}
            </Button>
          </div>
          {persistMessage && <span className="text-xs text-muted-foreground">{persistMessage}</span>}
        </div>
      </div>

      <DemoBanner />

      <EconomicRiskPanel data={data} />

      {/*
        Recommendation column is placed FIRST in source order so keyboard/
        screen-reader tab order matches the visual reading order required at
        narrow widths (state -> economic risk -> recommendation -> options).
        Desktop's wide-left/narrow-right layout is achieved with explicit
        grid column placement (xl:col-start-*), NOT the CSS `order` property
        — `order` only changes visual position, not tab order, which would
        silently re-break this same mismatch at the xl breakpoint.
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div
          id="recommendation-card"
          className="flex flex-col gap-4 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-6 xl:self-start"
        >
          <RecommendationCard data={data} />
          <RecommendationExecutionPanel
            batchId={baseline.batchId}
            recommendation={persistedRecommendation}
            actionTypes={actionTypes}
            outcome={outcome}
          />
        </div>

        {/*
          Supporting column. The six-pathway comparison leads it: the required
          reading order is state -> risk -> recommendation -> why -> operator
          action -> comparison/trace, and at narrow widths this column follows
          the recommendation column in the DOM, so placing DecisionEngine
          first here puts the comparison immediately after the decision it
          explains instead of three panels below it. Reordered by physical
          source order, not CSS `order`.
        */}
        <div className="flex flex-col gap-6 xl:col-start-1 xl:row-start-1">
          <div id="decision-engine-panel">
            <DecisionEngine decision={data.decision} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ConditionPanel data={data} />
            <LogisticsPanel data={data} />
          </div>

          <MarketPanel
            data={data}
            priceTrends={Object.fromEntries(baseline.markets.map((m) => [m.id, m.priceTrend ?? []]))}
          />

          <TelemetryForm batchId={baseline.batchId} />

          <EventTimeline activeScenarioId={scenario.id} onScenarioChange={setScenario} />
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
