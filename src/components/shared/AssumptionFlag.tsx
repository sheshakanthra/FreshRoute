import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/** Section 18 — machine-readable, always-visible uncertainty disclosure for plausible-unverified pathways. */
export function AssumptionFlag({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
