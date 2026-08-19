import { FlaskConical, ShieldCheck } from "lucide-react";

import type { EvidenceTier } from "@/domain/types";
import { cn } from "@/lib/utils";

const EVIDENCE_CONFIG: Record<EvidenceTier, { label: string; icon: typeof ShieldCheck; className: string }> = {
  VERIFIED: {
    label: "Verified core",
    icon: ShieldCheck,
    className: "border-success/30 bg-success/10 text-success",
  },
  PLAUSIBLE_UNVERIFIED: {
    label: "Plausible – unverified",
    icon: FlaskConical,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
};

/** Section 1 / 18 — the evidence-tier chip. First-class, distinct from generic StatusPill: identity is an icon, not a dot. */
export function EvidenceBadge({ tier, className }: { tier: EvidenceTier; className?: string }) {
  const config = EVIDENCE_CONFIG[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
