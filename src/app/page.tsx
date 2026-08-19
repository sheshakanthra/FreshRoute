import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { ProvenanceBadge } from "@/components/shared/ProvenanceBadge";
import { cn } from "@/lib/utils";

const DECISION_INPUTS = ["Condition", "Market", "Logistics", "Economics"];

/**
 * Section 8 / 46 — the root route. Product entry screen, not a marketing
 * landing page: identity, the one-line problem statement, and a single path
 * into the operational product.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">FreshRoute</span>
        <DemoBanner compact />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Value Recovery Decision Layer
          </span>

          <h1 className="text-5xl font-semibold tracking-tight text-balance">FreshRoute</h1>

          <p className="text-lg text-foreground/90 text-balance">
            Every hour changes the value of fresh produce.
          </p>

          <p className="max-w-md text-sm text-muted-foreground text-balance">
            FreshRoute evaluates the recovery pathways available to a batch and recommends the one
            expected to preserve the most value. One batch. Multiple recovery paths. One value-based
            recommendation.
          </p>

          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-2 px-8")}>
            ENTER OPERATIONS
          </Link>

          <DemoBanner />
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          {DECISION_INPUTS.map((input, index) => (
            <span key={input} className="flex items-center gap-2">
              <span className="rounded-sm border border-border px-2 py-1">{input}</span>
              {index < DECISION_INPUTS.length - 1 && <span aria-hidden="true">·</span>}
            </span>
          ))}
          <span aria-hidden="true">→</span>
          <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
            Decision
          </span>
        </div>
        <ProvenanceBadge />
      </footer>
    </div>
  );
}
