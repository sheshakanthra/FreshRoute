import { RoutePlaceholder } from "@/components/shared/RoutePlaceholder";

export default function DecisionsPage() {
  return (
    <RoutePlaceholder
      title="Decisions"
      description="Batches with an active FreshRoute recommendation awaiting operator review."
      builtInSession="Populated in Session 5 — driven by the same engine output as each batch's decision trace."
    />
  );
}
