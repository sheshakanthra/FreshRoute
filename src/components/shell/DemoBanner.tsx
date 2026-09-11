import { cn } from "@/lib/utils";

/**
 * Section 36 / 45 — the provenance disclosure line. Stays visible in the
 * primary decision experience: what backs the figures on screen is real
 * market prices, manually entered telemetry, and indicative logistics &
 * facilities data. This is a status readout, not a warning banner — no
 * alarming color, no dismiss action, no apology copy. The standalone
 * "Demo Mode" pill that used to precede this line (landing page top-right,
 * sidebar) carried no informational content of its own and has been
 * removed; this disclosure is the substantive part and stays.
 */
export function DemoBanner({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-xs text-muted-foreground", className)}>
      Real market prices (market_price) · manually entered telemetry · indicative logistics &amp; facilities
    </span>
  );
}
