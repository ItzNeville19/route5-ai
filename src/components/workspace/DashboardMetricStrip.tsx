"use client";

import Link from "next/link";
import type { WorkspaceActivityStats, WorkspaceExecutionMetrics } from "@/lib/workspace-summary";

type Props = {
  projectCount: number;
  extractionCount: number;
  activity: WorkspaceActivityStats;
  execution: WorkspaceExecutionMetrics;
  loading: boolean;
};

function pct(n: number | null): string {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function DashboardMetricStrip({
  projectCount,
  extractionCount,
  activity,
  execution,
  loading,
}: Props) {
  const wow = activity.weekOverWeekPercent;
  const ac = execution.actionCompletionRate;
  const openItems =
    execution.actionItemsTotal > 0
      ? execution.actionItemsTotal - execution.actionItemsCompleted
      : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Total runs</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] text-white">
            {loading ? "—" : extractionCount}
          </p>
          {!loading && wow !== null && activity.prior7DaysCount > 0 ? (
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                wow >= 0 ? "text-[#d9f99d]" : "text-rose-400"
              }`}
            >
              {pct(wow)} <span className="font-normal text-zinc-300">vs prior 7d</span>
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400">{projectCount} project(s)</span>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-400">
          Extractions saved · week-over-week uses UTC windows
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Checklist</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] text-white">
            {loading ? "—" : ac === null ? "—" : `${Math.round(ac * 100)}%`}
          </p>
          {!loading && execution.actionItemsTotal > 0 ? (
            <span className="text-[11px] text-zinc-300">
              {execution.actionItemsCompleted}/{execution.actionItemsTotal} done
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400">No items yet</span>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-300">
          Across all runs · open items appear in your project views
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Follow-ups</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] text-white">
            {loading ? "—" : openItems}
          </p>
          {!loading && execution.staleOpenActions > 0 ? (
            <span className="text-[11px] font-medium text-amber-400/90">
              {execution.staleOpenActions} on older runs
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400">—</span>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-300">
          Unchecked items ·{" "}
          <Link href="/overview" className="text-violet-300/90 hover:underline">
            Reports
          </Link>{" "}
          for detail
        </p>
      </div>
    </div>
  );
}
