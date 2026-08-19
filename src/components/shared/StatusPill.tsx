import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Section 42 — a generic status indicator reused across batch status,
 * feasibility, and evidence-tier displays. Tone is a visual signal only;
 * callers supply the label text.
 */
const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-secondary text-secondary-foreground",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        critical: "border-destructive/30 bg-destructive/10 text-destructive",
        info: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface StatusPillProps extends VariantProps<typeof statusPillVariants> {
  children: React.ReactNode;
  className?: string;
  dotted?: boolean;
}

export function StatusPill({ tone, children, className, dotted = true }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)}>
      {dotted && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
