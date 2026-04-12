"use client";

import { motion } from "framer-motion";
import type { WorkspaceActivityStats } from "@/lib/workspace-summary";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_BLOCKS = ["0–3", "4–7", "8–11", "12–15", "16–19", "20–23"];

type Props = {
  activity: WorkspaceActivityStats;
  loading: boolean;
  extractionCount: number;
};

export default function ReportsActivityHeatmap({ activity, loading, extractionCount }: Props) {
  const heat = activity.heatmap7x6;
  const flatHeat = heat.flat();
  const maxHeat = Math.max(1, ...flatHeat);

  const emptyRuns = (
    <p className="mt-4 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-4 py-8 text-center text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
      No runs in this window. Capture on Desk to populate the heatmap.
    </p>
  );

  return (
    <div>
      {loading ? (
        <div className="mt-4 h-[180px] animate-pulse rounded-xl bg-[var(--workspace-border)]/40" aria-hidden />
      ) : extractionCount === 0 ? (
        emptyRuns
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 overflow-x-auto"
        >
          <div className="inline-block min-w-full" role="img" aria-label="Activity heatmap — UTC, last 14 days">
            <div className="mb-1 grid grid-cols-[2.75rem_repeat(6,minmax(0,1fr))] gap-1 text-[9px] font-medium text-[var(--workspace-muted-fg)]">
              <span />
              {HOUR_BLOCKS.map((hb) => (
                <span key={hb} className="text-center">
                  {hb}h
                </span>
              ))}
            </div>
            {heat.map((row, ri) => (
              <div key={ri} className="mb-1 grid grid-cols-[2.75rem_repeat(6,minmax(0,1fr))] gap-1">
                <span className="flex items-center text-[10px] font-medium tabular-nums text-[var(--workspace-muted-fg)]">
                  {WD[ri]}
                </span>
                {row.map((cell, ci) => {
                  const intensity = cell / maxHeat;
                  return (
                    <motion.div
                      key={`${ri}-${ci}`}
                      initial={false}
                      whileHover={{ scale: 1.06, zIndex: 1 }}
                      className="aspect-square min-h-[18px] rounded-md border border-[var(--workspace-border)]"
                      style={{
                        background:
                          cell === 0
                            ? "color-mix(in srgb, var(--workspace-border) 55%, transparent)"
                            : `linear-gradient(145deg, rgba(139,92,246,${0.22 + intensity * 0.62}) 0%, rgba(91,33,182,${0.12 + intensity * 0.48}) 100%)`,
                        boxShadow:
                          cell > 0
                            ? `inset 0 1px 0 rgba(255,255,255,${0.08 + intensity * 0.12})`
                            : undefined,
                      }}
                      title={`${WD[ri]} · UTC ${HOUR_BLOCKS[ci]} · ${cell} run${cell === 1 ? "" : "s"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-[var(--workspace-muted-fg)]">
            <span>Less</span>
            <span className="h-2 w-20 rounded-full bg-gradient-to-r from-zinc-700 via-violet-600 to-violet-400" />
            <span>More</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
