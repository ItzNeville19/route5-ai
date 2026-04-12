"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, FolderKanban, ListTodo, Plug } from "lucide-react";
import type {
  ActivitySeriesByRange,
  WorkspaceActivityStats,
  WorkspaceConnectorReadiness,
  WorkspaceExecutionMetrics,
} from "@/lib/workspace-summary";
import EnterpriseIntelChartModal from "@/components/workspace/EnterpriseIntelChartModal";

type Props = {
  activity: WorkspaceActivityStats;
  execution: WorkspaceExecutionMetrics;
  activitySeries: ActivitySeriesByRange;
  readiness: WorkspaceConnectorReadiness | null;
  projectCount: number;
  extractionCount: number;
  loading: boolean;
};

export default function DashboardEnterpriseIntel({
  activity,
  execution,
  activitySeries,
  readiness,
  projectCount,
  extractionCount,
  loading,
}: Props) {
  const [chartOpen, setChartOpen] = useState(false);

  const wow = activity.weekOverWeekPercent;
  const openItems =
    execution.actionItemsTotal > 0
      ? execution.actionItemsTotal - execution.actionItemsCompleted
      : 0;

  const integrationLine = useMemo(() => {
    if (!readiness) return "—";
    const bits: string[] = [];
    if (readiness.openai) bits.push("AI");
    if (readiness.linear) bits.push("Linear");
    if (readiness.github) bits.push("GitHub");
    if (readiness.figma) bits.push("Figma");
    const n = bits.length;
    if (n === 0) return "Configure in Integrations";
    return bits.join(" · ");
  }, [readiness]);

  return (
    <div className="workspace-depth-root rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-black/90 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
      <EnterpriseIntelChartModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        activitySeries={activitySeries}
        execution={execution}
        extractionCount={extractionCount}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Snapshot</p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-white">This week at a glance</p>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-zinc-300">
            Counts from your workspace only. The carousel below has the interactive trend; use this for a larger modal
            with every range and export.
          </p>
          <button
            type="button"
            onClick={() => setChartOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-left text-[11px] font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-300 hover:decoration-zinc-400"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
            Expanded trend and export
          </button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/reports"
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Reports →
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
            <FolderKanban className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden />
            Projects
          </div>
          <p className="mt-2 text-[22px] font-semibold tabular-nums leading-none text-white">
            {loading ? "…" : projectCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-300">Workspaces you run extractions in</p>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
            <BarChart3 className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden />
            Runs (7 days)
          </div>
          <p className="mt-2 text-[22px] font-semibold tabular-nums leading-none text-white">
            {loading ? "…" : activity.last7DaysCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-300">
            {wow != null && activity.prior7DaysCount > 0
              ? `${wow >= 0 ? "+" : ""}${wow.toFixed(0)}% vs prior week`
              : "Rolling UTC window"}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
            <Plug className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden />
            Integrations
          </div>
          <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-200">{integrationLine}</p>
          <p className="mt-1 text-[11px] text-zinc-300">
            <Link href="/integrations" className="text-violet-300/90 hover:underline">
              Manage
            </Link>
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
            <ListTodo className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden />
            Open follow-ups
          </div>
          <p className="mt-2 text-[22px] font-semibold tabular-nums leading-none text-white">
            {loading ? "…" : openItems}
          </p>
          <p className="mt-1 text-[11px] text-zinc-300">
            {execution.staleOpenActions > 0
              ? `${execution.staleOpenActions} on runs older than 7d`
              : "Checklist items not checked off"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-400">
        {extractionCount} run{extractionCount === 1 ? "" : "s"} total
        {execution.actionCompletionRate != null
          ? ` · ${Math.round(execution.actionCompletionRate * 100)}% checklist completion`
          : ""}
      </p>
    </div>
  );
}
