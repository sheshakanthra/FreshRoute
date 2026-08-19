"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CURATED_SCENARIOS, SCENARIO_STABLE_SHIPMENT } from "@/demo/scenarios/presets";
import type { BatchCondition, DemandSignal, Scenario } from "@/domain/types";

const MARKET_STRENGTH_STEPS: DemandSignal[] = ["WEAK", "MODERATE", "STRONG"];
const CONDITION_STEPS: BatchCondition[] = ["HEALTHY", "MODERATE", "DEGRADED"];

const MARKET_STRENGTH_LABEL: Record<DemandSignal, string> = {
  WEAK: "Weak",
  MODERATE: "Moderate",
  STRONG: "Strong",
};

const CONDITION_LABEL: Record<BatchCondition, string> = {
  HEALTHY: "Healthy",
  MODERATE: "Moderate",
  DEGRADED: "Degraded",
};

/**
 * Section 19 — the scenario simulator. Every control writes into the same
 * scenario state the caller owns; that single state is what flows through
 * the engine to every panel on the page.
 */
export function ScenarioDrawer({
  scenario,
  onScenarioChange,
}: {
  scenario: Scenario;
  onScenarioChange: (next: Scenario) => void;
}) {
  function patch(partial: Partial<Scenario>) {
    onScenarioChange({
      ...scenario,
      id: "scenario-custom",
      name: "Custom",
      description: "Manually adjusted scenario controls.",
      ...partial,
    });
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="size-4" />
            Scenario controls
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Scenario control</SheetTitle>
          <SheetDescription>
            Every change flows through the engine live — condition, market and pathway ranking update immediately.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <ControlSlider
            label="Thermal exposure"
            valueLabel={`${scenario.thermalExposureHours}h`}
            value={scenario.thermalExposureHours}
            min={0}
            max={6}
            step={1}
            onChange={(v) => patch({ thermalExposureHours: v })}
            rangeLabels={["0h", "+6h"]}
          />

          <ControlSlider
            label="Transit delay"
            valueLabel={`${scenario.transitDelayHours}h`}
            value={scenario.transitDelayHours}
            min={0}
            max={6}
            step={1}
            onChange={(v) => patch({ transitDelayHours: v })}
            rangeLabels={["0h", "+6h"]}
          />

          <ControlSlider
            label="Destination market strength"
            valueLabel={MARKET_STRENGTH_LABEL[scenario.marketStrength]}
            value={MARKET_STRENGTH_STEPS.indexOf(scenario.marketStrength)}
            min={0}
            max={2}
            step={1}
            onChange={(i) => patch({ marketStrength: MARKET_STRENGTH_STEPS[i] })}
            rangeLabels={["Weak", "Strong"]}
          />

          <ControlSlider
            label="Batch condition"
            valueLabel={CONDITION_LABEL[scenario.batchCondition]}
            value={CONDITION_STEPS.indexOf(scenario.batchCondition)}
            min={0}
            max={2}
            step={1}
            onChange={(i) => patch({ batchCondition: CONDITION_STEPS[i] })}
            rangeLabels={["Healthy", "Degraded"]}
          />

          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">REROUTE execution-rights assumption</span>
              <span className="text-xs text-muted-foreground">
                Accepts the unverified assumption that the consignment can be redirected mid-transit.
              </span>
            </div>
            <Switch
              checked={scenario.rerouteValidationAssumptionEnabled}
              onCheckedChange={(checked: boolean) => patch({ rerouteValidationAssumptionEnabled: checked })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Curated scenarios
            </span>
            <div className="flex flex-col gap-2">
              {CURATED_SCENARIOS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={scenario.id === preset.id ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => onScenarioChange(preset)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="secondary" onClick={() => onScenarioChange(SCENARIO_STABLE_SHIPMENT)} className="w-full">
            <RotateCcw className="size-4" />
            Reset to stable scenario
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ControlSlider({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  rangeLabels,
}: {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  rangeLabels: [ReactNode, ReactNode];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-primary">{valueLabel}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v: number | readonly number[]) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{rangeLabels[0]}</span>
        <span>{rangeLabels[1]}</span>
      </div>
    </div>
  );
}
