"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { DemoBanner } from "./DemoBanner";
import { NAV_ITEMS, PRODUCT_VERSION } from "./nav-items";

/**
 * Section 5 — desktop left sidebar: brand identity, P0 navigation, and the
 * bottom block (demo mode / environment indicator / product version).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex flex-col gap-0.5 px-4 py-5">
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">FreshRoute</span>
        <span className="text-[11px] leading-tight text-muted-foreground">Value Recovery Decision Layer</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-2 py-2 pr-2.5 pl-2 text-sm transition-colors",
                isActive
                  ? "border-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive && "text-primary")} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-4">
        <DemoBanner compact />
        <span className="font-mono text-[10px] text-muted-foreground">{PRODUCT_VERSION}</span>
      </div>
    </aside>
  );
}
