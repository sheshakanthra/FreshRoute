import { Bell, CircleUserRound, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Section 5 — top bar: brand mark + current workspace, global search,
 * notifications, operator profile. Search/notifications/profile are visual
 * shell elements only in this build stage — there is no backend to wire them
 * to, so they render disabled rather than as dead, misleading controls.
 */
export function TopBar({ workspace = "Operations" }: { workspace?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-tight">FreshRoute</span>
        <span className="text-border">/</span>
        <span className="text-muted-foreground">{workspace}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            disabled
            placeholder="Search batches, markets, facilities…"
            className="h-8 w-64 rounded-md border border-input bg-muted/40 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed"
          />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          disabled
          aria-label="Notifications (not available in this build stage)"
        >
          <Bell className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          disabled
          aria-label="Operator profile (not available in this build stage)"
        >
          <CircleUserRound className="size-4" />
        </Button>
      </div>
    </header>
  );
}
