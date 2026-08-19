import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchWorkspace } from "@/components/batch/BatchWorkspace";
import { batches } from "@/demo/data/batches";

export function generateStaticParams() {
  return batches.map((batch) => ({ id: batch.id }));
}

export default async function BatchDetailPage({ params }: PageProps<"/batches/[id]">) {
  const { id } = await params;

  if (!batches.some((batch) => batch.id === id)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard" className="w-fit text-xs text-muted-foreground hover:text-foreground">
        ← Back to Operations Center
      </Link>

      <BatchWorkspace batchId={id} />
    </div>
  );
}
