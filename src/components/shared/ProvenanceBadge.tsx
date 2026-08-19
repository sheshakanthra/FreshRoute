import { cn } from "@/lib/utils";

/**
 * Section 36 — every demo dataset carries dataProvenance: SYNTHETIC. This
 * badge is the visible, machine-readable-styled marker for that fact.
 */
export function ProvenanceBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      Synthetic
    </span>
  );
}
