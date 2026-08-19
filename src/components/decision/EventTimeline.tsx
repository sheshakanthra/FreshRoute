"use client";

import { motion } from "framer-motion";

import { CURATED_SCENARIOS } from "@/demo/scenarios/presets";
import type { Scenario } from "@/domain/types";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  time: string;
  label: string;
  scenarioIndex?: number;
  scrollToId?: string;
}

/** Section 26 — narrative events. Preset-backed events apply that scenario; the rest scroll to where their effect shows up. */
const TIMELINE_EVENTS: TimelineEvent[] = [
  { time: "06:00", label: "Shipment dispatched", scenarioIndex: 0 },
  { time: "09:40", label: "Thermal exposure detected", scenarioIndex: 1 },
  { time: "10:16", label: "Market conditions reassessed", scenarioIndex: 2 },
  { time: "10:17", label: "FreshRoute recalculates candidate pathways", scrollToId: "decision-engine-panel" },
  { time: "10:18", label: "Recommendation issued", scrollToId: "recommendation-card" },
];

export function EventTimeline({
  activeScenarioId,
  onScenarioChange,
}: {
  activeScenarioId: string;
  onScenarioChange: (scenario: Scenario) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">Event timeline</h2>

      <div className="flex flex-col">
        {TIMELINE_EVENTS.map((event, index) => {
          const scenario = event.scenarioIndex !== undefined ? CURATED_SCENARIOS[event.scenarioIndex] : undefined;
          const isActive = scenario ? scenario.id === activeScenarioId : false;

          return (
            <motion.button
              key={event.label}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
              onClick={() => {
                if (scenario) {
                  onScenarioChange(scenario);
                } else if (event.scrollToId) {
                  document.getElementById(event.scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={cn(
                "flex items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40",
                isActive && "bg-accent/60",
              )}
            >
              <span className="mt-0.5 w-10 shrink-0 font-mono text-xs text-muted-foreground">{event.time}</span>
              <span className="flex flex-col items-center">
                <span className={cn("size-2 shrink-0 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground/50")} />
                {index < TIMELINE_EVENTS.length - 1 && <span className="mt-0.5 h-6 w-px bg-border" />}
              </span>
              <span className="text-xs text-foreground/90">{event.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
