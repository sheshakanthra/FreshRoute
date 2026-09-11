// Live-database-backed page: never statically prerendered at build time.
export const dynamic = "force-dynamic";

import { BatchTable } from "@/components/batch/BatchTable";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { NewBatchDialog } from "@/components/batch/NewBatchDialog";
import { getRealBatchDashboardEntries } from "@/server/services/batchListService";
import { getCommodityByCode } from "@/server/repositories/commodities";
import { listMarketsWithPriceData } from "@/server/repositories/markets";

export default async function BatchesPage() {
  const entries = await getRealBatchDashboardEntries();
  const commodity = await getCommodityByCode("TOMATO");
  const marketOptions = commodity ? await listMarketsWithPriceData(commodity.id, 100) : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Batches</h1>
          <p className="text-sm text-muted-foreground">
            The full roster of active perishable batches and their decision state.
          </p>
        </div>
        <NewBatchDialog
          marketOptions={marketOptions.map((m) => ({ id: m.id, name: m.name, district: m.district, marketType: m.marketType }))}
        />
      </div>

      <DemoBanner />

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-12 text-center">
          <span className="text-sm font-medium text-foreground">No batches yet</span>
          <span className="text-xs text-muted-foreground">Create one to see it evaluated by the decision engine.</span>
        </div>
      ) : (
        <BatchTable entries={entries} />
      )}
    </div>
  );
}
