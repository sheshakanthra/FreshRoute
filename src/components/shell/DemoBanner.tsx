import { cn } from "@/lib/utils";

/**
 * Section 36 / 45 — the environment/provenance indicator. Stays visible in
 * the primary decision experience. This is a status readout, not a warning
 * banner — no alarming color, no dismiss action, no apology copy.
 */
export function DemoBanner({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
        Demo Mode
      </span>
      {!compact && (
        <span className="font-mono text-xs text-muted-foreground">
          Synthetic telemetry · indicative market values
        </span>
      )}
    </div>
  );
}
