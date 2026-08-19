import { RoutePlaceholder } from "@/components/shared/RoutePlaceholder";

export default function BatchesPage() {
  return (
    <RoutePlaceholder
      title="Batches"
      description="The full roster of active perishable batches and their decision state."
      builtInSession="Populated in Session 3 — batch table sourced from the synthetic batch dataset."
    />
  );
}
