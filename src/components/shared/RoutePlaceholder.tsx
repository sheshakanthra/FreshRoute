import { DemoBanner } from "@/components/shell/DemoBanner";

/** A route that exists and renders, but whose real content lands in a later session. */
export function RoutePlaceholder({
  title,
  description,
  builtInSession,
}: {
  title: string;
  description: string;
  builtInSession: string;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-border p-8">
        <span className="font-mono text-xs text-muted-foreground">{builtInSession}</span>
        <DemoBanner />
      </div>
    </div>
  );
}
