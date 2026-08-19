"use client";

import { motion } from "framer-motion";

import { PathwayCard } from "@/components/decision/PathwayCard";
import type { RankedAction } from "@/domain/types";

/**
 * Section 13 — all six pathways, ranked. `layout` is enabled per row now so
 * Session 5's scenario-driven reordering animates without further changes
 * here; a static render (this session) simply skips the transition.
 */
export function RankingList({ candidates }: { candidates: RankedAction[] }) {
  return (
    <div className="flex flex-col gap-2">
      {candidates.map((candidate) => (
        <motion.div key={candidate.action} layout transition={{ duration: 0.25, ease: "easeOut" }}>
          <PathwayCard candidate={candidate} />
        </motion.div>
      ))}
    </div>
  );
}
