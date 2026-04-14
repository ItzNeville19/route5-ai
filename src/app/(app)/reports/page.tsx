"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Clock, Download, FileJson, FolderOpen, Printer } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import ExecutionTrendChart from "@/components/workspace/ExecutionTrendChart";
import ReportsActivityHeatmap from "@/components/workspace/ReportsActivityHeatmap";
import { emptyActivitySeries } from "@/lib/workspace-activity-stats";
import { deskUrl } from "@/lib/desk-routes";
import type {
  ActivitySeriesByRange,
  ChartTimeRange,
  RecentExtractionRow,
  WorkspaceActivityStats,
  WorkspaceConnectorReadiness,
  WorkspaceExecutionMetrics,
} from "@/lib/workspace-summary";

type SummaryPayload = {
  projectCount: number;
  extractionCount: number;
  recent: RecentExtractionRow[];
  activity: WorkspaceActivityStats;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
  readiness?: WorkspaceConnectorReadiness;
};

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative z-[1]">
      <p className="text-[clamp(0.5625rem,1.2vw,0.625rem)] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[clamp(1.05rem,2.4vw,1.35rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1.5 max-w-2xl text-[clamp(0.8125rem,1.6vw,0.9375rem)] leading-relaxed text-[var(--workspace-muted-fg)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/** Full analytics: charts, heatmap, exports — Overview stays lightweight. */
export default function ReportsPage() {
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const exportFull = !loadingEntitlements && (entitlements?.features.exportFull ?? false);
  const advancedAnalytics =
    !loadingEntitlements && (entitlements?.features.advancedAnalytics ?? false);
  const reduceMotion = useReducedMotion();

  const [data, setData] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [chartRange, setChartRange] = useState<ChartTimeRange>("7d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as SummaryPayload;
      if (res.ok) {
        setData({
          projectCount: json.projectCount ?? 0,
          extractionCount: json.extractionCount ?? 0,
          recent: Array.isArray(json.recent) ? json.recent : [],
          activity: json.activity as WorkspaceActivityStats,
          activitySeries: (json.activitySeries as ActivitySeriesByRange) ?? emptyActivitySeries(),
          execution: json.execution as WorkspaceExecutionMetrics,
          readiness: json.readiness,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exportFilename = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10);
    return `route5-workspace-${d}.json`;
  }, []);

  const downloadJson = useCallback(async () => {
    if (!exportFull) return;
    setExportBusy(true);
    try {
      const res = await fetch("/api/workspace/reports-export", { credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return;
      }
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportBusy(false);
    }
  }, [exportFilename, exportFull]);

  const printReport = useCallback(() => {
    if (!exportFull) return;
    window.print();
  }, [exportFull]);

  const projectCount = data?.projectCount ?? null;
  const extractionCount = data?.extractionCount ?? null;
  const recent = data?.recent ?? [];

  const sectionMotion = reduceMotion
    ? { initial: false, animate: false }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      id="workspace-reports-root"
      className="mx-auto w-full max-w-[min(100%,960px)] pb-24 print:max-w-none print:pb-0"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="workspace-liquid-glass relative mb-8 overflow-hidden rounded-[28px] p-5 sm:p-6 print:hidden">
        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-accent)]/12 text-[var(--workspace-accent)] ring-1 ring-[var(--workspace-accent)]/20">
              <BarChart3 className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-[clamp(0.5625rem,1.2vw,0.625rem)] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
                Analytics
              </p>
              <h1 className="mt-1 text-[clamp(1.45rem,3.5vw,1.95rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
                Reports &amp; activity
              </h1>
              <p className="mt-2 max-w-xl text-[clamp(0.8125rem,1.6vw,0.9375rem)] leading-relaxed text-[var(--workspace-muted-fg)]">
                {exportFull ? (
                  <>
                    Interactive trends, activity heatmap, and export — same data as Overview, with full
                    depth here.
                  </>
                ) : (
                  <>
                    Live counts and trends —{" "}
                    <Link href="/account/plans" className="font-medium text-[var(--workspace-accent)] hover:underline">
                      Pro
                    </Link>{" "}
                    unlocks full JSON export, print/PDF, SVG charts, and advanced analytics below.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {!loadingEntitlements && !exportFull ? (
              <p className="max-w-[280px] text-right text-[11px] leading-relaxed text-amber-100/90">
                Full exports are a Pro feature — limits in{" "}
                <Link href="/settings" className="font-medium text-[var(--workspace-accent)] hover:underline">
                  Settings
                </Link>
                .
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={loading || !data || !exportFull || exportBusy}
                onClick={() => void downloadJson()}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:bg-[var(--workspace-canvas)] disabled:opacity-50"
              >
                <FileJson className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                {exportBusy ? "Preparing…" : "Export JSON"}
              </button>
              <button
                type="button"
                disabled={!exportFull}
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:bg-[var(--workspace-canvas)] disabled:opacity-50"
              >
                <Printer className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-3 print:grid-cols-3"
        {...sectionMotion}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.04, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="workspace-liquid-glass relative overflow-hidden rounded-2xl p-5 shadow-sm">
          <div className="relative z-[1] flex items-center gap-2 text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            <FolderOpen className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
            Projects
          </div>
          <p className="relative z-[1] mt-2 text-[clamp(1.5rem,4vw,1.75rem)] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading ? "—" : projectCount}
          </p>
        </div>
        <div className="workspace-liquid-glass relative overflow-hidden rounded-2xl p-5 shadow-sm">
          <div className="relative z-[1] flex items-center gap-2 text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            <BarChart3 className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
            Extractions
          </div>
          <p className="relative z-[1] mt-2 text-[clamp(1.5rem,4vw,1.75rem)] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading ? "—" : extractionCount}
          </p>
        </div>
        <div className="workspace-liquid-glass relative overflow-hidden rounded-2xl p-5 shadow-sm">
          <div className="relative z-[1] flex items-center gap-2 text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            <Download className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
            WoW runs
          </div>
          <p className="relative z-[1] mt-2 text-[clamp(1.5rem,4vw,1.75rem)] font-semibold tabular-nums tracking-tight text-[var(--workspace-fg)]">
            {loading || !data ? "—" : data.activity.weekOverWeekPercent == null ? "—" : `${data.activity.weekOverWeekPercent >= 0 ? "+" : ""}${data.activity.weekOverWeekPercent.toFixed(0)}%`}
          </p>
          <p className="relative z-[1] mt-1 text-[11px] text-[var(--workspace-muted-fg)]">vs prior 7 UTC days</p>
        </div>
      </motion.div>

      <motion.section
        className="workspace-liquid-glass relative mt-10 overflow-hidden rounded-[28px] p-5 sm:p-6 print:border print:bg-white"
        {...sectionMotion}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHead
          eyebrow="Trends"
          title="Runs vs decisions"
          subtitle="Pick a time range, full screen, or export SVG (Pro). Data is UTC."
        />
        <div className="relative z-[1] mt-5">
          {loading || !data ? (
            <div className="h-48 animate-pulse rounded-xl bg-[var(--workspace-border)]/40" aria-hidden />
          ) : (
            <ExecutionTrendChart
              seriesByRange={data.activitySeries}
              extractionCount={data.extractionCount}
              showControls
              allowSvgExport={exportFull}
              range={chartRange}
              onRangeChange={setChartRange}
            />
          )}
        </div>
        {!loading && data && advancedAnalytics ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="relative z-[1] mt-6 grid gap-3 sm:grid-cols-3"
          >
            <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                Checklist completion
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--workspace-fg)]">
                {data.execution.actionCompletionRate != null
                  ? `${Math.round(data.execution.actionCompletionRate * 100)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                Decisions logged
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--workspace-fg)]">
                {data.execution.decisionsTotal}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                Follow-ups on older runs
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--workspace-fg)]">
                {data.execution.staleOpenActions}
              </p>
              <p className="mt-1 text-[10px] text-[var(--workspace-muted-fg)]">
                Open items on runs older than 7 days (UTC)
              </p>
            </div>
          </motion.div>
        ) : !loadingEntitlements && data && !advancedAnalytics ? (
          <div className="relative z-[1] mt-6 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-4 py-5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            <span className="font-semibold text-[var(--workspace-fg)]">Advanced analytics</span> (checklist
            completion, decision totals, stale follow-ups) are included on{" "}
            <Link href="/account/plans" className="font-medium text-[var(--workspace-accent)] hover:underline">
              Pro and above
            </Link>
            .
          </div>
        ) : null}
      </motion.section>

      <motion.section
        className="workspace-liquid-glass relative mt-8 overflow-hidden rounded-[28px] p-5 sm:p-6 print:border print:bg-white"
        {...sectionMotion}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHead
          eyebrow="Patterns"
          title="Activity by time"
          subtitle="Last 14 days of extractions — UTC hours × weekday. Hover cells for counts."
        />
        <div className="relative z-[1]">
          {data ? (
            <ReportsActivityHeatmap
              activity={data.activity}
              loading={loading}
              extractionCount={data.extractionCount}
            />
          ) : (
            <div className="mt-4 h-[180px] animate-pulse rounded-xl bg-[var(--workspace-border)]/40" aria-hidden />
          )}
        </div>
      </motion.section>

      <motion.section
        className="relative mt-10 print:mt-6"
        {...sectionMotion}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHead eyebrow="Log" title="Recent extractions" subtitle="Newest first — open a row to jump to the run." />
        {loading ? (
          <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-5 py-10 text-center text-[13px] text-[var(--workspace-muted-fg)]">
            No runs yet — open{" "}
            <Link href={deskUrl()} className="font-medium text-[var(--workspace-accent)] hover:underline">
              Desk
            </Link>{" "}
            or a{" "}
            <Link href="/projects" className="font-medium text-[var(--workspace-accent)] hover:underline">
              project
            </Link>
            .
          </p>
        ) : (
          <ul className="workspace-liquid-glass relative mt-4 divide-y divide-[var(--workspace-border)] overflow-hidden rounded-2xl print:break-inside-avoid">
            {recent.map((r, i) => (
              <motion.li
                key={r.id}
                initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.04 + i * 0.03, duration: 0.35 }}
              >
                <Link
                  href={`/projects/${r.projectId}#ex-${r.id}`}
                  className="relative z-[1] flex gap-4 px-5 py-4 transition hover:bg-[var(--workspace-canvas)]/60 print:block"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                      {r.projectName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--workspace-fg)]">
                      {r.summarySnippet}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                    <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    {formatWhen(r.createdAt)}
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      <p className="mt-10 text-center text-[12px] text-[var(--workspace-muted-fg)] print:hidden">
        <Link href="/projects" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← Projects overview
        </Link>
      </p>
    </motion.div>
  );
}
