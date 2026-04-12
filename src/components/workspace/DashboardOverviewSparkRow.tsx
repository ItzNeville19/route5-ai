"use client";

import type { WorkspaceActivityStats, WorkspaceExecutionMetrics } from "@/lib/workspace-summary";

type Props = {
  projectCount: number;
  activity: WorkspaceActivityStats;
  execution: WorkspaceExecutionMetrics;
  loading: boolean;
};

/** Loud-style three spark bars: projects, 7d runs, checklist completion. */
export default function DashboardOverviewSparkRow({
  projectCount,
  activity,
  execution,
  loading,
}: Props) {
  const ac = execution.actionCompletionRate;
  const runs7 = activity.last7DaysCount;
  const prior = activity.prior7DaysCount;
  const maxProj = Math.max(8, projectCount, 1);
  const maxRuns = Math.max(1, runs7, prior, 1);
  const projPct = Math.min(100, (projectCount / maxProj) * 100);
  const runsPct = Math.min(100, (runs7 / maxRuns) * 100);
  const checkPct = ac === null ? 0 : Math.round(ac * 100);

  const items = [
    { label: "Projects", value: loading ? "—" : String(projectCount), pct: projPct, tone: "violet" as const },
    { label: "Runs (7d)", value: loading ? "—" : String(runs7), pct: runsPct, tone: "violet" as const },
    {
      label: "Checklist",
      value: loading ? "—" : ac === null ? "—" : `${checkPct}%`,
      pct: ac === null ? 0 : checkPct,
      tone: "muted" as const,
    },
  ];

  return (
    <div className="grid min-w-0 flex-1 grid-cols-3 gap-3 sm:gap-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
              {it.label}
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-zinc-100">{it.value}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                it.tone === "violet"
                  ? "bg-gradient-to-r from-violet-600 to-violet-400"
                  : "bg-gradient-to-r from-zinc-600 to-zinc-400"
              }`}
              style={{ width: `${it.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
