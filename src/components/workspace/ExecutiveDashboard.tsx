"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LiveDashboardMetrics, VelocityWeek } from "@/lib/dashboard/compute";
import type { SnapshotRow } from "@/lib/dashboard/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  Loader2,
  Radio,
} from "lucide-react";
import { NativeDatetimeLocalInput } from "@/components/ui/native-datetime-fields";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import type { UpgradePromptPayload } from "@/lib/billing/types";

type TeamRow = LiveDashboardMetrics["teamBreakdown"][number];

type EscalationApiRow = {
  id: string;
  commitmentId: string;
  severity: "warning" | "urgent" | "critical" | "overdue";
  triggeredAt: string;
  snoozedUntil: string | null;
  commitmentTitle: string;
  commitmentDeadline: string;
  ownerDisplayName: string;
};

function severityPillClass(sev: EscalationApiRow["severity"]): string {
  switch (sev) {
    case "warning":
      return "border-amber-300/50 bg-amber-500/15 text-amber-100";
    case "urgent":
      return "border-orange-400/40 bg-orange-500/15 text-orange-100";
    case "critical":
      return "border-red-400/50 bg-red-500/15 text-red-100";
    case "overdue":
      return "border-rose-900/60 bg-rose-950/50 text-rose-100";
    default:
      return "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]";
  }
}

function severityLabel(sev: EscalationApiRow["severity"]): string {
  return sev.charAt(0).toUpperCase() + sev.slice(1);
}

function formatTriggeredAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function useCountUp(target: number, durationMs = 900): number {
  const [v, setV] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 1 - (1 - t) * (1 - t);
      setV(Math.round(target * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return v;
}

function healthColorClass(tier: "green" | "yellow" | "red"): string {
  if (tier === "green") return "text-emerald-300";
  if (tier === "yellow") return "text-amber-300";
  return "text-red-300";
}

type SortKey = keyof Pick<TeamRow, "displayName" | "total" | "completedOnTime" | "completionRate" | "overdueCount">;

export default function ExecutiveDashboard() {
  const { showUpgrade } = useBillingUpgrade();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<"30d" | "90d" | "12m">("30d");
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [weeks, setWeeks] = useState<VelocityWeek[]>([]);
  const [loadingVel, setLoadingVel] = useState(true);
  const [live, setLive] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("displayName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exporting, setExporting] = useState(false);
  const [escalations, setEscalations] = useState<EscalationApiRow[]>([]);
  const [loadingEscalations, setLoadingEscalations] = useState(true);
  const [snoozeFor, setSnoozeFor] = useState<EscalationApiRow | null>(null);
  const [resolveFor, setResolveFor] = useState<EscalationApiRow | null>(null);
  const [snoozeReason, setSnoozeReason] = useState("");
  const [snoozeUntilLocal, setSnoozeUntilLocal] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [escalationSaving, setEscalationSaving] = useState(false);

  const loadMetrics = useCallback(async () => {
    const res = await fetch("/api/dashboard/metrics", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as {
      orgId?: string;
      metrics?: LiveDashboardMetrics;
    };
    if (res.ok && data.metrics && data.orgId) {
      setOrgId(data.orgId);
      setMetrics(data.metrics);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const res = await fetch(`/api/dashboard/trend?range=${trendRange}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { snapshots?: SnapshotRow[] };
      if (res.ok) setSnapshots(data.snapshots ?? []);
    } finally {
      setLoadingTrend(false);
    }
  }, [trendRange]);

  const loadVelocity = useCallback(async () => {
    setLoadingVel(true);
    try {
      const res = await fetch("/api/dashboard/velocity", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { weeks?: VelocityWeek[] };
      if (res.ok) setWeeks(data.weeks ?? []);
    } finally {
      setLoadingVel(false);
    }
  }, []);

  const loadEscalations = useCallback(async () => {
    setLoadingEscalations(true);
    try {
      const res = await fetch("/api/escalations?resolved=open&limit=8", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        escalations?: EscalationApiRow[];
      };
      if (res.ok) setEscalations(data.escalations ?? []);
    } finally {
      setLoadingEscalations(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadMetrics();
        await loadEscalations();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMetrics, loadEscalations]);

  useEffect(() => {
    void loadTrend();
  }, [loadTrend]);

  useEffect(() => {
    void loadVelocity();
  }, [loadVelocity]);

  useEffect(() => {
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      setLive(false);
      return;
    }
    const channel = client.channel(`org-dashboard:${orgId}`);
    channel.on("broadcast", { event: "refresh" }, () => {
      void loadMetrics();
      void loadEscalations();
      void loadTrend();
      void loadVelocity();
    });
    channel.subscribe((status) => {
      setLive(status === "SUBSCRIBED");
    });
    return () => {
      void client.removeChannel(channel);
      setLive(false);
    };
  }, [orgId, loadMetrics, loadEscalations, loadTrend, loadVelocity]);

  const healthDisplay = useCountUp(metrics?.healthScore ?? 0);

  const trendData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: s.snapshot_date,
        score: Math.round(s.health_score),
      })),
    [snapshots]
  );

  const barData = useMemo(
    () => weeks.map((w) => ({ name: w.weekLabel, count: w.count })),
    [weeks]
  );

  const sortedTeam = useMemo(() => {
    const rows = metrics?.teamBreakdown ?? [];
    const mul = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
  }, [metrics?.teamBreakdown, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function submitSnooze() {
    if (!snoozeFor || !snoozeReason.trim() || !snoozeUntilLocal) return;
    setEscalationSaving(true);
    try {
      const res = await fetch(`/api/escalations/${encodeURIComponent(snoozeFor.id)}/snooze`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snooze_reason: snoozeReason.trim(),
          snoozed_until: new Date(snoozeUntilLocal).toISOString(),
        }),
      });
      if (res.ok) {
        setSnoozeFor(null);
        setSnoozeReason("");
        await loadEscalations();
      }
    } finally {
      setEscalationSaving(false);
    }
  }

  async function submitResolve() {
    if (!resolveFor || !resolutionNotes.trim()) return;
    setEscalationSaving(true);
    try {
      const res = await fetch(`/api/escalations/${encodeURIComponent(resolveFor.id)}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_notes: resolutionNotes.trim() }),
      });
      if (res.ok) {
        setResolveFor(null);
        setResolutionNotes("");
        await loadEscalations();
      }
    } finally {
      setEscalationSaving(false);
    }
  }

  async function downloadPdf() {
    setExporting(true);
    try {
      const res = await fetch("/api/dashboard/export", { credentials: "same-origin" });
      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as { upgrade?: UpgradePromptPayload };
        if (data.upgrade) showUpgrade(data.upgrade);
        return;
      }
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "route5-scorecard.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const tier = metrics?.healthTier ?? "green";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1680px] flex-col gap-5 pb-24">
      <section className="relative overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-gradient-to-br from-[var(--workspace-surface)]/90 via-[var(--workspace-canvas)]/95 to-violet-950/15 p-1 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(167,139,250,0.1),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col gap-4 rounded-[18px] border border-white/5 bg-[var(--workspace-canvas)]/40 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                Executive dashboard
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[22px]">
                Execution health
              </h1>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                Live metrics from org commitments with trend context and escalation pressure.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/feed"
                  className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                >
                  Open feed
                </Link>
                <Link
                  href="/workspace/escalations"
                  className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                >
                  Escalation queue
                </Link>
                <Link
                  href="/projects"
                  className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 px-3 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                >
                  Project health
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {live ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200">
                  <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] px-3 py-1.5 text-[11px] text-[var(--workspace-muted-fg)]">
                  <Activity className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  Polling
                </span>
              )}
              <button
                type="button"
                disabled={exporting}
                onClick={() => void downloadPdf()}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading || !metrics ? (
        <div className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading metrics…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <div className="col-span-2 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4 sm:col-span-2 lg:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                Health score
              </p>
              <p
                className={`mt-2 text-[42px] font-semibold tabular-nums leading-none sm:text-[52px] ${healthColorClass(tier)}`}
              >
                {healthDisplay}
              </p>
              <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">Last 30d on-time / due</p>
            </div>
            <MetricChip label="Active" value={metrics.activeCount} />
            <MetricChip label="On track" value={metrics.onTrackCount} />
            <MetricChip label="At risk" value={metrics.atRiskCount} warn={metrics.atRiskCount > 0} />
            <MetricChip label="Overdue" value={metrics.overdueCount} danger={metrics.overdueCount > 0} />
            <MetricChip label="Done (week)" value={metrics.completedWeekCount} />
            <MetricChip label="Done (month)" value={metrics.completedMonthCount} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-[var(--workspace-fg)]">Health trend</h2>
                <div className="flex gap-1">
                  {(["30d", "90d", "12m"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTrendRange(r)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        trendRange === r
                          ? "bg-[var(--workspace-nav-active)] text-[var(--workspace-fg)]"
                          : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 h-[260px] w-full">
                {loadingTrend ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-[var(--workspace-muted-fg)]">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : trendData.length < 2 ? (
                  <p className="flex h-full items-center px-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    Trend data builds over time — check back tomorrow after daily snapshots run.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fill: "var(--workspace-muted-fg)", fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--workspace-muted-fg)", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--workspace-surface)",
                          border: "1px solid var(--workspace-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="rgb(56, 189, 248)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4">
              <h2 className="text-[13px] font-semibold text-[var(--workspace-fg)]">Decision velocity</h2>
              <p className="mt-0.5 text-[11px] text-[var(--workspace-muted-fg)]">Commitments created per week</p>
              <div className="mt-4 h-[260px] w-full">
                {loadingVel ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-[var(--workspace-muted-fg)]">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: "var(--workspace-muted-fg)", fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "var(--workspace-muted-fg)", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--workspace-surface)",
                          border: "1px solid var(--workspace-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" fill="rgb(167, 139, 250)" radius={[6, 6, 0, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4">
              <h2 className="text-[13px] font-semibold text-[var(--workspace-fg)]">Top escalations</h2>
              <ul className="mt-3 space-y-2">
                {loadingEscalations ? (
                  <li className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </li>
                ) : escalations.length === 0 ? (
                  <li className="text-[13px] text-[var(--workspace-muted-fg)]">No active escalations</li>
                ) : (
                  escalations.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <div className="flex flex-col gap-2 rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 px-3 py-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Link
                            href={`/workspace/commitments?id=${encodeURIComponent(e.commitmentId)}`}
                            className="text-[13px] font-medium text-[var(--workspace-fg)] transition hover:text-[var(--workspace-accent)]"
                          >
                            {e.commitmentTitle}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityPillClass(e.severity)}`}
                          >
                            {severityLabel(e.severity)}
                          </span>
                        </div>
                        <span className="flex flex-wrap gap-2 text-[11px] text-[var(--workspace-muted-fg)]">
                          <span>{e.ownerDisplayName}</span>
                          <span>{new Date(e.commitmentDeadline).toLocaleString()}</span>
                          <span>Triggered {formatTriggeredAgo(e.triggeredAt)}</span>
                          {e.snoozedUntil && new Date(e.snoozedUntil) > new Date() ? (
                            <span className="text-sky-200">Snoozed</span>
                          ) : null}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSnoozeFor(e);
                              setSnoozeReason("");
                              const max = new Date(Date.now() + 23 * 3600000);
                              const pad = (n: number) => String(n).padStart(2, "0");
                              setSnoozeUntilLocal(
                                `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}T${pad(max.getHours())}:${pad(max.getMinutes())}`
                              );
                            }}
                            className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
                          >
                            Snooze
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResolveFor(e);
                              setResolutionNotes("");
                            }}
                            className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4">
              <h2 className="text-[13px] font-semibold text-[var(--workspace-fg)]">Team performance</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]">
                      <th className="pb-2 pr-2">
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("displayName")}>
                          Name
                          <SortIcon active={sortKey === "displayName"} dir={sortDir} />
                        </button>
                      </th>
                      <th className="pb-2 pr-2">
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("total")}>
                          Total
                          <SortIcon active={sortKey === "total"} dir={sortDir} />
                        </button>
                      </th>
                      <th className="pb-2 pr-2">
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("completedOnTime")}>
                          On time
                          <SortIcon active={sortKey === "completedOnTime"} dir={sortDir} />
                        </button>
                      </th>
                      <th className="pb-2 pr-2">
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("completionRate")}>
                          Rate %
                          <SortIcon active={sortKey === "completionRate"} dir={sortDir} />
                        </button>
                      </th>
                      <th className="pb-2">
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("overdueCount")}>
                          Overdue
                          <SortIcon active={sortKey === "overdueCount"} dir={sortDir} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeam.map((row) => (
                      <tr key={row.ownerId} className="h-9 border-b border-[var(--workspace-border)]/50">
                        <td className="pr-2 text-[13px] text-[var(--workspace-fg)]">{row.displayName}</td>
                        <td className="pr-2 text-[13px] tabular-nums">{row.total}</td>
                        <td className="pr-2 text-[13px] tabular-nums">{row.completedOnTime}</td>
                        <td className="pr-2 text-[13px] tabular-nums">{row.completionRate}%</td>
                        <td className={`text-[13px] tabular-nums ${row.overdueCount > 0 ? "font-semibold text-red-300" : ""}`}>
                          {row.overdueCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {snoozeFor ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
              <div className="w-full max-w-md rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] p-5 shadow-2xl">
                <h3 className="text-[16px] font-semibold text-[var(--workspace-fg)]">Snooze escalation</h3>
                <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">Max 24 hours from now.</p>
                <div className="mt-4 space-y-3">
                  <label className="block text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                    Reason *
                  </label>
                  <textarea
                    value={snoozeReason}
                    onChange={(ev) => setSnoozeReason(ev.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                  />
                  <label className="block text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                    Until *
                  </label>
                  <NativeDatetimeLocalInput
                    value={snoozeUntilLocal}
                    onChange={(ev) => setSnoozeUntilLocal(ev.target.value)}
                    className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSnoozeFor(null)}
                    className="rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={escalationSaving || !snoozeReason.trim() || !snoozeUntilLocal}
                    onClick={() => void submitSnooze()}
                    className="rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-50"
                  >
                    {escalationSaving ? "Saving…" : "Snooze"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {resolveFor ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
              <div className="w-full max-w-md rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] p-5 shadow-2xl">
                <h3 className="text-[16px] font-semibold text-[var(--workspace-fg)]">Resolve escalation</h3>
                <label className="mt-3 block text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                  Resolution notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(ev) => setResolutionNotes(ev.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResolveFor(null)}
                    className="rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-fg)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={escalationSaving || !resolutionNotes.trim()}
                    onClick={() => void submitResolve()}
                    className="rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-50"
                  >
                    {escalationSaving ? "Saving…" : "Resolve"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MetricChip({
  label,
  value,
  warn,
  danger,
}: {
  label: string;
  value: number;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-3 ${
        danger ? "ring-1 ring-red-400/35" : warn ? "ring-1 ring-amber-400/30" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--workspace-fg)]">{value}</p>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronDown className="h-3 w-3 opacity-40" aria-hidden />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />;
}
