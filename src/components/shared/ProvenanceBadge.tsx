import type { DataProvenance } from "@/domain/types";
import { cn } from "@/lib/utils";

/**
 * Section 36 — the visible, machine-readable-styled marker for a value's
 * dataProvenance. Defaults to SYNTHETIC (the root landing page's only
 * caller wants exactly that, unconditionally, and stays unchanged) —
 * everywhere a real value can now flow through (D2's market_price, D3/D4's
 * real batches), pass the actual provenance so the badge reflects the
 * specific value it's attached to, not a blanket assumption. Real and
 * synthetic values are visually distinct (success tone vs. neutral) so a
 * genuinely real figure never reads as an indicative one, or vice versa.
 */
export function ProvenanceBadge({
  provenance = "SYNTHETIC",
  className,
}: {
  provenance?: DataProvenance;
  className?: string;
}) {
  const isReal = provenance === "REAL";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase",
        isReal ? "border-success/30 text-success" : "border-border text-muted-foreground",
        className,
      )}
    >
      {isReal ? "Real" : "Synthetic"}
    </span>
  );
}
