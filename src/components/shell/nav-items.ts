import { Gauge, ListChecks, Package, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: "/dashboard" | "/batches" | "/decisions";
  icon: LucideIcon;
}

/**
 * Section 5 / Session 2 — P0 sidebar items only. Markets, Facilities and
 * Activity are added once their routes exist (Session 6 / 7). Do not add an
 * entry here for a route that hasn't been built.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Gauge },
  { label: "Batches", href: "/batches", icon: Package },
  { label: "Decisions", href: "/decisions", icon: ListChecks },
];

/** Section 5 — bottom sidebar "Product version". */
export const PRODUCT_VERSION = "v0.1.0-demo";
