// Live-database-backed page: never statically prerendered at build time.
export const dynamic = "force-dynamic";

import { BatchTable } from "@/components/batch/BatchTable";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { KPIGrid } from "@/components/shared/KPIGrid";
import { computeDashboardKpis, computeOutcomeKpis, getRealBatchDashboardEntries } from "@/server/services/batchListService";
import { listRecommendationOutcomes } from "@/server/repositories/recommendationOutcomes";

export default async function DashboardPage() {
  const [entries, outcomeRows] = await Promise.all([getRealBatchDashboardEntries(), listRecommendationOutcomes()]);
  const kpis = computeDashboardKpis(entries);
  const outcomeKpis = computeOutcomeKpis(outcomeRows);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Operations Center</h1>
        <p className="text-sm text-muted-foreground">
          FreshRoute decision state across active perishable batches.
        </p>
      </div>

      <DemoBanner />

      <KPIGrid kpis={kpis} outcomeKpis={outcomeKpis} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Active batches</h2>
        <BatchTable entries={entries} />
      </div>
    </div>
  );
}
