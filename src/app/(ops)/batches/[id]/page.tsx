import Link from "next/link";
import { notFound } from "next/navigation";

import { DemoBanner } from "@/components/shell/DemoBanner";
import { StatusPill } from "@/components/shared/StatusPill";
import { STATUS_LABEL, STATUS_TONE } from "@/components/batch/batchStatus";
import { batches } from "@/demo/data/batches";
import { formatKg } from "@/lib/formatting/number";

export function generateStaticParams() {
  return batches.map((batch) => ({ id: batch.id }));
}

export default async function BatchDetailPage({ params }: PageProps<"/batches/[id]">) {
  const { id } = await params;
  const batch = batches.find((b) => b.id === id);

  if (!batch) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard" className="w-fit text-xs text-muted-foreground hover:text-foreground">
        ← Back to Operations Center
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg font-semibold tracking-tight">{batch.id}</h1>
          <StatusPill tone={STATUS_TONE[batch.status]}>{STATUS_LABEL[batch.status]}</StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">
          {batch.commodity} · {formatKg(batch.quantityKg)} · {batch.currentLocationLabel}
        </p>
      </div>

      <DemoBanner />

      <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-border p-8">
        <span className="font-mono text-xs text-muted-foreground">
          Full batch command view — condition panel, market intelligence, six-pathway decision engine,
          recommendation card — arrives in Session 4.
        </span>
      </div>
    </div>
  );
}
