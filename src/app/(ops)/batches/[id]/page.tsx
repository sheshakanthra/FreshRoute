import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchHeader } from "@/components/batch/BatchHeader";
import { ConditionPanel } from "@/components/batch/ConditionPanel";
import { LogisticsPanel } from "@/components/batch/LogisticsPanel";
import { DecisionEngine } from "@/components/decision/DecisionEngine";
import { RecommendationCard } from "@/components/decision/RecommendationCard";
import { MarketPanel } from "@/components/market/MarketPanel";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { batches } from "@/demo/data/batches";
import { getBatchViewData } from "@/demo/scenarios/batchViewData";

export function generateStaticParams() {
  return batches.map((batch) => ({ id: batch.id }));
}

export default async function BatchDetailPage({ params }: PageProps<"/batches/[id]">) {
  const { id } = await params;
  const data = getBatchViewData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard" className="w-fit text-xs text-muted-foreground hover:text-foreground">
        ← Back to Operations Center
      </Link>

      <BatchHeader data={data} />

      <DemoBanner />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ConditionPanel data={data} />
            <LogisticsPanel data={data} />
          </div>

          <MarketPanel data={data} />

          <DecisionEngine decision={data.decision} />
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <RecommendationCard data={data} />
        </div>
      </div>
    </div>
  );
}
