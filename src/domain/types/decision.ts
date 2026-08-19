/**
 * Engine input/output contract (Section 22 / 32).
 */

import type {
  ConfidenceStatus,
  DataProvenance,
  EvidenceTier,
  MarginStatus,
  RecoveryAction,
  RiskLevel,
} from "./enums";
import type { Batch, Facility, Market, MarketSnapshot, Scenario, Telemetry } from "./models";

/** Everything evaluateDecision() needs to produce a DecisionResult. */
export interface DecisionContext {
  batch: Batch;
  telemetry: Telemetry;
  markets: Market[];
  marketSnapshots: MarketSnapshot[];
  facilities: Facility[];
  scenario: Scenario;
  engineVersion: string;
}

/** Section 14 — per-action feasibility pass/fail with a human reason. */
export interface FeasibilityResult {
  action: RecoveryAction;
  feasible: boolean;
  reason?: string;
}

/** Section 22 — strongly typed ranked action object. */
export interface RankedAction {
  action: RecoveryAction;
  expectedRecovery: number;
  cost: number;
  riskLevel: RiskLevel;
  evidenceTier: EvidenceTier;
  feasible: boolean;
  feasibilityReason?: string;
  score: number;
  rank: number;
  reason?: string;
}

/** Section 22 — the main engine output. */
export interface DecisionResult {
  recommendedAction: RecoveryAction | null;
  baselineValue: number;
  recommendedValue: number | null;
  modelledUplift: number | null;
  rankedCandidates: RankedAction[];
  feasibilityResults: FeasibilityResult[];
  reasons: string[];
  assumptionFlags: string[];
  confidenceStatus: ConfidenceStatus;
  engineVersion: string;
  dataProvenance: DataProvenance;
  marginStatus: MarginStatus;
  decisionMarginPct: number | null;
}

/** Section 16 — the recommendation card's data shape. */
export interface Recommendation {
  action: RecoveryAction;
  expectedRecoverableValue: number;
  modelledUplift: number;
  baselineValue: number;
  evidenceTier: EvidenceTier;
  confidenceStatus: ConfidenceStatus;
  validForWindow: string;
  reasons: string[];
  assumptionFlags: string[];
  marginStatus: MarginStatus;
  decisionMarginPct: number;
}

/** Section 17 — auditable trace behind a recommendation. */
export interface DecisionTrace {
  generatedAtIso: string;
  inputSnapshot: {
    condition: string;
    remainingUsefulLifeHours: number;
    marketStateSummary: string;
    logisticsSummary: string;
    costSummary: string;
  };
  feasibility: FeasibilityResult[];
  valueCalculation: {
    action: RecoveryAction;
    baselineValue: number;
    candidateRecovery: number;
    cost: number;
    riskAdjustment: number;
  }[];
  ranking: RankedAction[];
  explanation: string;
  provenance: {
    telemetry: DataProvenance;
    marketValues: DataProvenance;
  };
  engineVersion: string;
  scenarioVersion: string;
}
