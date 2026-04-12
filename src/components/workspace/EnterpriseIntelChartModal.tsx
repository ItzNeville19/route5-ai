"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ActivitySeriesByRange, WorkspaceExecutionMetrics } from "@/lib/workspace-summary";
import ExecutionTrendChart from "@/components/workspace/ExecutionTrendChart";

type Props = {
  open: boolean;
  onClose: () => void;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
  extractionCount: number;
  allowSvgExport?: boolean;
};

export default function EnterpriseIntelChartModal({
  open,
  onClose,
  activitySeries,
  execution,
  extractionCount,
  allowSvgExport = true,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const openActions =
    execution.actionItemsTotal > 0
      ? execution.actionItemsTotal - execution.actionItemsCompleted
      : 0;

  const modal = (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200]" role="presentation">
          <motion.button
            type="button"
            aria-label="Close chart"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ei-chart-title"
              className="pointer-events-auto relative max-h-[min(92dvh,880px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-zinc-900 to-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                    Workspace analytics
                  </p>
                  <h2 id="ei-chart-title" className="mt-1 text-[18px] font-semibold tracking-tight text-white">
                    Runs &amp; decisions
                  </h2>
                  <p className="mt-1 text-[12px] text-zinc-300">
                    {allowSvgExport
                      ? "Pick a range, go full screen, or export SVG — same data as Reports."
                      : "Pick a range or go full screen — upgrade to Pro for SVG export and full Reports bundle."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[min(72dvh,720px)] overflow-y-auto px-5 pb-5 pt-4">
                <ExecutionTrendChart
                  seriesByRange={activitySeries}
                  extractionCount={extractionCount}
                  allowSvgExport={allowSvgExport}
                  showControls
                />
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5 text-[12px] text-zinc-400"
                >
                  <span className="font-semibold text-zinc-300">{openActions}</span> open checklist items
                  {execution.staleOpenActions > 0 ? (
                    <>
                      {" "}
                      · <span className="font-semibold text-amber-400/90">{execution.staleOpenActions}</span> on
                      older runs (&gt;7d)
                    </>
                  ) : null}
                  {" · "}
                  <span className="font-semibold text-zinc-300">{execution.decisionsTotal}</span> decisions logged
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
