"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { LiveDashboardMetrics, VelocityWeek } from "@/lib/dashboard/compute";
import type { SnapshotRow } from "@/lib/dashboard/store";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { resolveWorkspaceTheme } from "@/lib/workspace-themes";
import { pickWorkspaceThemePhoto, workspacePhotoUrl } from "@/lib/workspace-theme-photos";
import { getDeskHeadline } from "@/lib/workspace-welcome";
import { getWorkspaceIanaTimeZone } from "@/lib/workspace-regions";
import { useUser } from "@clerk/nextjs";

type ActivityRow = {
  id: string;
  title: string;
  status: string;
  owner_id: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ViewMode = "admin" | "employee";
type Scope = "org" | "self";
type AgentMode = "suggest_then_approve" | "auto_send_limited" | "fully_automatic";
type AgentAction = {
  commitmentId: string;
  ownerId: string;
  title: string;
  severity: "warning" | "urgent" | "critical" | "overdue";
  kind: "owner_nudge" | "escalate";
  message: string;
};

function actionKey(action: AgentAction) {
  return `${action.kind}:${action.commitmentId}:${action.severity}`;
}

function prettyStatus(status: string): string {
  if (status === "completed") return "done";
  if (status === "in_progress") return "in progress";
  if (status === "not_started") return "pending";
  return status.replaceAll("_", " ");
}

export default function ExecutiveDashboardNeo() {
  const { user } = useUser();
  const { orgRole } = useWorkspaceData();
  const exp = useWorkspaceExperience();
  const tick = useAlignedMinuteTick();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [weeks, setWeeks] = useState<VelocityWeek[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("employee");
  const [agentCanRun, setAgentCanRun] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>("auto_send_limited");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentPreview, setAgentPreview] = useState<AgentAction[]>([]);
  const [agentPreviewing, setAgentPreviewing] = useState(false);
  const [selectedActionKeys, setSelectedActionKeys] = useState<string[]>([]);
  const [agentExecuting, setAgentExecuting] = useState(false);
  const [agentSummary, setAgentSummary] = useState<{
    created: number;
    upgraded: number;
    stale24: number;
    stale48: number;
    openEscalations: number;
    generatedAt: string;
  } | null>(null);

  const canPreviewEmployee = orgRole === "admin";
  const effectiveMode: ViewMode = canPreviewEmployee
    ? mode
    : "employee";
  const scope: Scope = effectiveMode === "employee" ? "self" : "org";

  const displayName =
    user?.firstName?.trim() ||
    user?.fullName?.trim()?.split(/\s+/)[0] ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";
  const tz = getWorkspaceIanaTimeZone(
    exp.prefs.workspaceTimezone,
    exp.prefs.workspaceRegionKey
  );
  const greeting = getDeskHeadline(displayName, tz);

  const theme = useMemo(() => resolveWorkspaceTheme(exp.prefs, tick), [exp.prefs, tick]);
  const photo = useMemo(() => pickWorkspaceThemePhoto(theme.resolvedId, new Date()), [theme.resolvedId]);
  const photoUrl = useMemo(() => workspacePhotoUrl(photo.path, 1200), [photo.path]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `?scope=${scope}`;
      const [metricsRes, trendRes, velocityRes, activityRes] = await Promise.all([
        fetch(`/api/dashboard/metrics${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/trend${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/velocity${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/activity${qs}`, { credentials: "same-origin" }),
      ]);
      const metricsJson = (await metricsRes.json().catch(() => ({}))) as {
        orgId?: string;
        metrics?: LiveDashboardMetrics;
      };
      const trendJson = (await trendRes.json().catch(() => ({}))) as {
        snapshots?: SnapshotRow[];
      };
      const velocityJson = (await velocityRes.json().catch(() => ({}))) as {
        weeks?: VelocityWeek[];
      };
      const activityJson = (await activityRes.json().catch(() => ({}))) as {
        activity?: ActivityRow[];
      };
      if (metricsRes.ok && metricsJson.metrics) {
        setMetrics(metricsJson.metrics);
        setOrgId(metricsJson.orgId ?? null);
      }
      if (trendRes.ok) setSnapshots(trendJson.snapshots ?? []);
      if (velocityRes.ok) setWeeks(velocityJson.weeks ?? []);
      if (activityRes.ok) setActivity(activityJson.activity ?? []);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (orgRole === "admin") {
      setMode("admin");
    } else {
      setMode("employee");
    }
  }, [orgRole]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/agent/commitment-ops/state", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        canRun?: boolean;
        policy?: { mode?: AgentMode };
      };
      if (!cancelled) {
        setAgentCanRun(Boolean(res.ok && data.canRun));
        if (data.policy?.mode) setAgentMode(data.policy.mode);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-dashboard:${orgId}`);
    channel.on("broadcast", { event: "refresh" }, () => void loadAll());
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [orgId, loadAll]);

  const totalCommitments = useMemo(
    () => (metrics?.teamBreakdown ?? []).reduce((acc, row) => acc + row.total, 0),
    [metrics?.teamBreakdown]
  );

  const completionRate = useMemo(() => {
    if (!metrics) return 0;
    const completedOnTime = metrics.teamBreakdown.reduce(
      (acc, row) => acc + row.completedOnTime,
      0
    );
    return totalCommitments > 0 ? Math.round((completedOnTime / totalCommitments) * 100) : 0;
  }, [metrics, totalCommitments]);

  const topContributor = useMemo(() => {
    const rows = metrics?.teamBreakdown ?? [];
    if (rows.length === 0) return null;
    return [...rows].sort(
      (a, b) => b.completedOnTime - a.completedOnTime || b.total - a.total
    )[0];
  }, [metrics?.teamBreakdown]);

  const trendData = useMemo(
    () =>
      snapshots.map((row) => ({
        date: row.snapshot_date.slice(5),
        score: Math.round(row.health_score),
      })),
    [snapshots]
  );

  const velocityData = useMemo(
    () =>
      weeks.map((row) => ({
        label: row.weekLabel,
        count: row.count,
      })),
    [weeks]
  );

  async function onStatusChange(id: string, status: "pending" | "in_progress" | "done") {
    setUpdatingId(id);
    try {
      await fetch(`/api/dashboard/commitments/${encodeURIComponent(id)}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } finally {
      setUpdatingId(null);
    }
  }

  async function runAgentNow() {
    setAgentRunning(true);
    try {
      const res = await fetch("/api/agent/commitment-ops/run", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: {
          created: number;
          upgraded: number;
          stale24: number;
          stale48: number;
          openEscalations: number;
          generatedAt: string;
        };
      };
      if (res.ok && data.summary) {
        setAgentSummary(data.summary);
        await loadAll();
      }
    } finally {
      setAgentRunning(false);
    }
  }

  async function saveAgentMode(nextMode: AgentMode) {
    setAgentSaving(true);
    try {
      await fetch("/api/agent/commitment-ops/config", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      setAgentMode(nextMode);
    } finally {
      setAgentSaving(false);
    }
  }

  async function previewAgent() {
    setAgentPreviewing(true);
    try {
      const res = await fetch("/api/agent/commitment-ops/preview", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        actions?: AgentAction[];
      };
      if (res.ok) {
        const actions = data.actions ?? [];
        setAgentPreview(actions);
        setSelectedActionKeys(actions.map((action) => actionKey(action)));
      }
    } finally {
      setAgentPreviewing(false);
    }
  }

  async function executeSelectedAgentActions() {
    const selected = agentPreview.filter((action) =>
      selectedActionKeys.includes(actionKey(action))
    );
    if (selected.length === 0) return;
    setAgentExecuting(true);
    try {
      const res = await fetch("/api/agent/commitment-ops/execute", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: selected }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: {
          escalationsCreated?: number;
          escalationsUpgraded?: number;
          generatedAt?: string;
        };
      };
      if (res.ok) {
        if (data.summary) {
          setAgentSummary({
            created: data.summary.escalationsCreated ?? 0,
            upgraded: data.summary.escalationsUpgraded ?? 0,
            stale24: 0,
            stale48: 0,
            openEscalations: 0,
            generatedAt: data.summary.generatedAt ?? new Date().toISOString(),
          });
        }
        setAgentPreview([]);
        setSelectedActionKeys([]);
        await loadAll();
      }
    } finally {
      setAgentExecuting(false);
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex min-h-[50vh] items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Route5 execution dashboard…
      </div>
    );
  }

  return (
    <div className="route5-neo-dashboard mx-auto w-full max-w-[1520px] pb-12">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75">
          Route5 Command Center
        </p>
        {canPreviewEmployee ? (
          <div className="inline-flex rounded-full border border-emerald-400/25 bg-black/35 p-1">
            <button
              type="button"
              onClick={() => setMode("admin")}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                effectiveMode === "admin"
                  ? "bg-emerald-400/25 text-emerald-50"
                  : "text-emerald-200/80"
              }`}
            >
              Admin view
            </button>
            <button
              type="button"
              onClick={() => setMode("employee")}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                effectiveMode === "employee"
                  ? "bg-emerald-400/25 text-emerald-50"
                  : "text-emerald-200/80"
              }`}
            >
              Employee preview
            </button>
          </div>
        ) : null}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300/20 bg-[#0b0f0c]/85 px-3 py-2 text-[12px] text-emerald-100">
        <span className="font-semibold">Agent</span>
        <span className="text-emerald-200/75">
          Automatically escalates stale execution and nudges ownership.
        </span>
        {agentCanRun ? (
          <button
            type="button"
            onClick={() => void runAgentNow()}
            disabled={agentRunning}
            className="ml-auto rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-100"
          >
            {agentRunning ? "Running agent…" : "Run agent now"}
          </button>
        ) : null}
        {agentCanRun ? (
          <button
            type="button"
            onClick={() => void previewAgent()}
            disabled={agentPreviewing}
            className="rounded-full border border-emerald-300/30 bg-black/40 px-3 py-1 text-[11px] font-semibold text-emerald-100"
          >
            {agentPreviewing ? "Previewing…" : "Preview actions"}
          </button>
        ) : null}
        {agentCanRun ? (
          <select
            value={agentMode}
            onChange={(event) => void saveAgentMode(event.target.value as AgentMode)}
            disabled={agentSaving}
            className="rounded-full border border-emerald-300/30 bg-black/40 px-3 py-1 text-[11px] font-semibold text-emerald-100"
          >
            <option value="suggest_then_approve">Suggest + approve</option>
            <option value="auto_send_limited">Auto send limited</option>
            <option value="fully_automatic">Fully automatic</option>
          </select>
        ) : null}
        {agentPreview.length > 0 ? (
          <button
            type="button"
            onClick={() => void executeSelectedAgentActions()}
            disabled={agentExecuting || selectedActionKeys.length === 0}
            className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-50"
          >
            {agentExecuting ? "Executing…" : `Execute selected (${selectedActionKeys.length})`}
          </button>
        ) : null}
        {agentSummary ? (
          <span className="text-emerald-200/75">
            Last run: +{agentSummary.created} new escalations, +{agentSummary.upgraded} upgrades,{" "}
            {agentSummary.openEscalations} open ({new Date(agentSummary.generatedAt).toLocaleTimeString()})
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_2.2fr]">
        <section className="grid gap-3">
          <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-3 shadow-[0_20px_50px_-32px_rgba(16,185,129,0.45)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[18px] border border-emerald-200/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-[360px] w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,7,0.2),rgba(5,10,7,0.75))]" />
              <div className="absolute inset-0 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200/80">
                  Execution Health
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-white">{greeting}</h1>
                <p className="mt-2 max-w-[28ch] text-[12px] text-emerald-100/80">
                  {effectiveMode === "admin"
                    ? "Org-wide execution signal across commitments, owners, and escalations."
                    : "Your personal commitments, progress, and activity stream."}
                </p>
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-emerald-300/30 bg-black/45 p-4 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200/70">
                    Health score
                  </p>
                  <p className="mt-1 text-5xl font-semibold text-emerald-200">
                    {Math.round(metrics?.healthScore ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
            <p className="text-[12px] font-semibold text-emerald-100">Top contributor</p>
            {topContributor ? (
              <div className="mt-3 space-y-2 text-[13px]">
                <p className="text-lg font-semibold text-white">{topContributor.displayName}</p>
                <p className="text-emerald-200/80">
                  {topContributor.completedOnTime} completed on time
                </p>
                <p className="text-emerald-200/70">{topContributor.total} total commitments</p>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-emerald-200/70">No owner activity yet.</p>
            )}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard label="Total commitments" value={totalCommitments} />
            <MetricCard label="Completion rate" value={`${completionRate}%`} />
            <MetricCard label="Active commitments" value={metrics?.activeCount ?? 0} />
            <MetricCard
              label="Total workload"
              value={(metrics?.activeCount ?? 0) + (metrics?.atRiskCount ?? 0) + (metrics?.overdueCount ?? 0)}
            />
          </div>

          <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
            <p className="text-[12px] font-semibold text-emerald-100">Execution states</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
              <StateChip label="On track" value={metrics?.onTrackCount ?? 0} tone="emerald" />
              <StateChip label="At risk" value={metrics?.atRiskCount ?? 0} tone="amber" />
              <StateChip label="Overdue" value={metrics?.overdueCount ?? 0} tone="rose" />
            </div>
            <div className="mt-3 h-6 overflow-hidden rounded-full border border-emerald-300/20 bg-black/30">
              <div className="flex h-full w-full">
                {Array.from({ length: 52 }).map((_, idx) => {
                  const total =
                    (metrics?.onTrackCount ?? 0) +
                    (metrics?.atRiskCount ?? 0) +
                    (metrics?.overdueCount ?? 0) ||
                    1;
                  const onTrackSlots = Math.round(((metrics?.onTrackCount ?? 0) / total) * 52);
                  const riskSlots = Math.round(((metrics?.atRiskCount ?? 0) / total) * 52);
                  const tone =
                    idx < onTrackSlots
                      ? "bg-emerald-400/65"
                      : idx < onTrackSlots + riskSlots
                        ? "bg-amber-400/65"
                        : "bg-rose-400/65";
                  return <div key={idx} className={`h-full w-[2%] border-r border-black/20 ${tone}`} />;
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.8fr_1.2fr]">
            <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
              <p className="text-[12px] font-semibold text-emerald-100">Execution trend</p>
              <div className="mt-3 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid stroke="rgba(16,185,129,0.16)" />
                    <XAxis dataKey="date" tick={{ fill: "#9ee4c5", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ee4c5", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(5,10,7,0.92)",
                        border: "1px solid rgba(52,211,153,0.28)",
                        borderRadius: 12,
                      }}
                    />
                    <Line
                      dataKey="score"
                      type="monotone"
                      stroke="#34d399"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
              <p className="text-[12px] font-semibold text-emerald-100">Status distribution</p>
              <div className="mt-3 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { label: "On Track", count: metrics?.onTrackCount ?? 0 },
                      { label: "At Risk", count: metrics?.atRiskCount ?? 0 },
                      { label: "Overdue", count: metrics?.overdueCount ?? 0 },
                    ]}
                  >
                    <CartesianGrid stroke="rgba(16,185,129,0.1)" />
                    <XAxis dataKey="label" tick={{ fill: "#9ee4c5", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ee4c5", fontSize: 10 }} />
                    <Bar
                      dataKey="count"
                      fill="#34d399"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
              <p className="text-[12px] font-semibold text-emerald-100">Activity volume</p>
              <div className="mt-3 h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocityData}>
                    <CartesianGrid stroke="rgba(16,185,129,0.1)" />
                    <XAxis dataKey="label" tick={{ fill: "#9ee4c5", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ee4c5", fontSize: 10 }} />
                    <Line
                      dataKey="count"
                      type="monotone"
                      stroke="#6ee7b7"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#6ee7b7" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
              <p className="text-[12px] font-semibold text-emerald-100">Commitment activity feed</p>
              <ul className="mt-3 space-y-2 max-h-[250px] overflow-y-auto">
                {activity.length === 0 ? (
                  <li className="text-[13px] text-emerald-200/75">No recent updates yet.</li>
                ) : (
                  activity.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/15 bg-black/25 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">{row.title}</p>
                        <p className="text-[11px] text-emerald-200/70">
                          {row.owner_name} · {new Date(row.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-emerald-200/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-100">
                          {prettyStatus(row.status)}
                        </span>
                        <select
                          value={
                            row.status === "completed"
                              ? "done"
                              : row.status === "in_progress"
                                ? "in_progress"
                                : "pending"
                          }
                          disabled={updatingId === row.id}
                          onChange={(event) =>
                            void onStatusChange(
                              row.id,
                              event.target.value as "pending" | "in_progress" | "done"
                            )
                          }
                          className="rounded-lg border border-emerald-300/25 bg-black/45 px-2 py-1 text-[11px] text-emerald-100"
                        >
                          <option value="pending">pending</option>
                          <option value="in_progress">in progress</option>
                          <option value="done">done</option>
                        </select>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
      {agentPreview.length > 0 ? (
        <div className="mt-3 rounded-[22px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-emerald-100">
              Agent action preview ({agentPreview.length})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedActionKeys(agentPreview.map((action) => actionKey(action)))}
                className="rounded-full border border-emerald-300/25 bg-black/30 px-2.5 py-1 text-[11px] text-emerald-100"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionKeys([])}
                className="rounded-full border border-emerald-300/25 bg-black/30 px-2.5 py-1 text-[11px] text-emerald-100"
              >
                Clear
              </button>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {agentPreview.slice(0, 8).map((action) => (
              <li
                key={`${action.kind}-${action.commitmentId}`}
                className="rounded-xl border border-emerald-200/15 bg-black/25 px-3 py-2"
              >
                <label className="mb-1 flex items-center gap-2 text-[11px] text-emerald-100/85">
                  <input
                    type="checkbox"
                    checked={selectedActionKeys.includes(actionKey(action))}
                    onChange={(event) => {
                      const key = actionKey(action);
                      setSelectedActionKeys((prev) =>
                        event.target.checked
                          ? [...new Set([...prev, key])]
                          : prev.filter((item) => item !== key)
                      );
                    }}
                  />
                  Approve
                </label>
                <p className="text-[12px] font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-[11px] text-emerald-200/70">
                  {action.kind.replaceAll("_", " ")} · {action.severity}
                </p>
                <p className="mt-1 text-[11px] text-emerald-100/85">{action.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] border border-emerald-300/20 bg-[#0b0f0c]/85 p-4 backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-200/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StateChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const map = {
    emerald: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-300/25 bg-amber-500/10 text-amber-100",
    rose: "border-rose-300/25 bg-rose-500/10 text-rose-100",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${map[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.1em]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
