import { BatchTable } from "@/components/batch/BatchTable";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { getBatchDashboardEntries } from "@/demo/scenarios/dashboardDecisions";

export default function BatchesPage() {
  const entries = getBatchDashboardEntries();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Batches</h1>
        <p className="text-sm text-muted-foreground">
          The full roster of active perishable batches and their decision state.
        </p>
      </div>

      <DemoBanner />

      <BatchTable entries={entries} />
    </div>
  );
}
