"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBatchAction } from "@/app/(ops)/batches/actions";

const VARIETIES = ["Deshi", "Local", "Other", "Hybrid"] as const;

export interface MarketOption {
  id: string;
  name: string;
  district: string | null;
  marketType: "APMC" | "UZHAVAR_SANDHAI" | "OTHER";
}

/** Task 3 — batch creation UI. Replaces the fully-static demo batch roster
 * (src/demo/data/batches.ts) as the only way a batch enters the system. */
export function NewBatchDialog({ marketOptions }: { marketOptions: MarketOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const quantityKg = Number(formData.get("quantityKg"));
      const plannedMarketId = String(formData.get("plannedMarketId") ?? "");
      if (!plannedMarketId) throw new Error("Choose a destination market.");
      if (!Number.isFinite(quantityKg) || quantityKg <= 0) throw new Error("Quantity must be a positive number.");

      await createBatchAction({
        quantityKg,
        variety: String(formData.get("variety") ?? "") || undefined,
        plannedMarketId,
        origin: String(formData.get("origin") ?? "") || undefined,
        currentLocation: String(formData.get("currentLocation") ?? "") || undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create batch.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        New batch
      </DialogTrigger>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New batch</DialogTitle>
          <DialogDescription>
            Destination markets and their prices are real (from market_price). Quantity and origin are what you enter.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-3">
          <Field label="Quantity (kg)">
            <input
              name="quantityKg"
              type="number"
              min={1}
              step="1"
              required
              className="h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
            />
          </Field>

          <Field label="Variety">
            <select
              name="variety"
              className="h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
            >
              <option value="">Unspecified</option>
              {VARIETIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Destination market (real)">
            <select
              name="plannedMarketId"
              required
              className="h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
            >
              <option value="">Select a market…</option>
              {marketOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.district ?? "TN"} ({m.marketType})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Origin">
            <input
              name="origin"
              type="text"
              placeholder="e.g. Dindigul collection centre"
              className="h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
            />
          </Field>

          <Field label="Current location">
            <input
              name="currentLocation"
              type="text"
              placeholder="Defaults to origin if left blank"
              className="h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm text-foreground focus-visible:outline-none"
            />
          </Field>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
