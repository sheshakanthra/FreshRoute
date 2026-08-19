import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Section 5 — the operational application shell wrapping every /dashboard,
 * /batches and /decisions route. The entry screen at "/" does not use this
 * shell; it is the product intro, not an operations view.
 */
export function AppShell({ children, workspace }: { children: ReactNode; workspace?: string }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar workspace={workspace} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
