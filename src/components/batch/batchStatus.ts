import type { BatchCondition, BatchStatus } from "@/domain/types";

export const CONDITION_TONE: Record<BatchCondition, "success" | "warning" | "critical"> = {
  HEALTHY: "success",
  MODERATE: "warning",
  DEGRADED: "critical",
};

export const STATUS_TONE: Record<BatchStatus, "success" | "warning" | "critical" | "info"> = {
  NORMAL: "success",
  AT_RISK: "critical",
  DECISION_REQUIRED: "info",
  ASSUMPTION_FLAGGED: "warning",
};

export const STATUS_LABEL: Record<BatchStatus, string> = {
  NORMAL: "Normal",
  AT_RISK: "At risk",
  DECISION_REQUIRED: "Decision required",
  ASSUMPTION_FLAGGED: "Assumption flagged",
};
