"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  AlertTriangle,
  Bot,
  ClipboardCheck,
  Flame,
  LayoutGrid,
  LucideIcon,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LiveDashboardMetrics, TeamRow } from "@/lib/dashboard/compute";
import EmployeePreviewPanel from "@/components/workspace/EmployeePreviewPanel";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import WelcomeHeroCard from "@/components/command-center/WelcomeHeroCard";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { resolveWorkspaceSurfaceMode } from "@/lib/workspace-dashboard-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Scope = "org" | "self";

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

type TrendPoint = {
  snapshot_date: string;
  health_score?: number;
  active_count: number;
  on_track_count: number;
  at_risk_count: number;
  overdue_count: number;
};

type EscalationRow = {
  id: string;
  severity: string;
  commitmentTitle: string;
  ownerDisplayName: string;
  ageHours: number;
};

type QueueAction = {
  commitmentId: string;
  ownerId: string;
  title: string;
  message: string;
  severity: string;
  kind: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

const PINNED_ACTIONS: Record<string, { href: string; label: string; icon: LucideIcon }> = {
  queue: { href: "/workspace/agent", label: "Agent", icon: Bot },
  escalations: { href: "/workspace/escalations", label: "Issues", icon: Flame },
  activity: { href: "/workspace/activity", label: "History", icon: ClipboardCheck },
  commitments: { href: "/workspace/commitments", label: "Commitments", icon: ClipboardCheck },
  customize: { href: "/workspace/customize", label: "Customize", icon: LayoutGrid },
};

const CANONICAL_SECTIONS = ["attention", "insights", "operations", "movement"] as const;

function normalizeDashboardSectionOrder(raw?: string[]): string[] {
  const legacy: Record<string, string> = {
    trend: "insights",
    owners: "insights",
    blockers: "operations",
    queue: "operations",
  };
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw ?? []) {
    const m = legacy[id] ?? id;
    if (!CANONICAL_SECTIONS.includes(m as (typeof CANONICAL_SECTIONS)[number]) || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  for (const id of CANONICAL_SECTIONS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export default function Route5AdminDashboard() {
  const { user } = useUser();
  const { orgRole, organizationId } = useWorkspaceData();
  const { prefs, setPrefs } = useWorkspaceExperience();
  const search = useSearchParams();
  const { openRunAgent } = useWorkspaceChromeActions();
  const canOrg = orgRole === "admin" || orgRole === "manager";
  const surfaceMode = resolveWorkspaceSurfaceMode(canOrg, search.get("view"), prefs.defaultWorkspaceView);
  const isEmployeePreview = surfaceMode === "employee";

  const agentHref = useMemo(() => {
    const p = new URLSearchParams(search.toString());
    p.set("view", surfaceMode);
    const qs = p.toString();
    return qs ? `/workspace/agent?${qs}` : "/workspace/agent";
  }, [search, surfaceMode]);

  const scope: Scope = isEmployeePreview ? "self" : "org";

  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [queueFull, setQueueFull] = useState<QueueAction[]>([]);
  const [loading, setLoading] = useState(true);

  const minuteTick = useAlignedMinuteTick();
  const now = useMemo(() => new Date(), [minuteTick]);

  const firstName =
    user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "there";

  const roleLabel =
    orgRole === "admin"
      ? "Administrator"
      : orgRole === "manager"
        ? "Team lead"
        : orgRole === "member"
          ? "Team member"
          : "Workspace";

  const load = useCallback(async (quiet?: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const qs = `?scope=${scope}`;
      const [mRes, aRes, tRes] = await Promise.all([
        fetch(`/api/dashboard/metrics${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/activity${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/trend${qs}&range=30d`, { credentials: "same-origin" }),
      ]);

      let eRes: Response | undefined;
      let qRes: Response | undefined;
      if (scope === "org" && canOrg) {
        [eRes, qRes] = await Promise.all([
          fetch(`/api/escalations?resolved=open&limit=12`, { credentials: "same-origin" }),
          fetch(`/api/agent/commitment-ops/preview`, { credentials: "same-origin" }),
        ]);
      }

      const mJson = (await mRes.json().catch(() => ({}))) as { metrics?: LiveDashboardMetrics };
      const aJson = (await aRes.json().catch(() => ({}))) as { activity?: ActivityRow[] };
      const tJson = (await tRes.json().catch(() => ({}))) as { snapshots?: TrendPoint[] };

      if (mRes.ok && mJson.metrics) setMetrics(mJson.metrics);
      setActivity(aRes.ok ? (aJson.activity ?? []) : []);
      setTrend(tRes.ok ? (tJson.snapshots ?? []) : []);

      if (eRes && qRes) {
        const eJson = (await eRes.json().catch(() => ({}))) as { escalations?: EscalationRow[] };
        const qJson = (await qRes.json().catch(() => ({}))) as { actions?: QueueAction[] };
        setEscalations(eRes.ok ? (eJson.escalations ?? []) : []);
        setQueueFull(qRes.ok ? (qJson.actions ?? []) : []);
      } else {
        setEscalations([]);
        setQueueFull([]);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [scope, canOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load(true);
    window.addEventListener("route5:commitments-changed", onRefresh);
    return () => window.removeEventListener("route5:commitments-changed", onRefresh);
  }, [load]);

  useEffect(() => {
    if (!organizationId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-dashboard:${organizationId}`);
    channel.on("broadcast", { event: "refresh" }, () => {
      void load(true);
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [organizationId, load]);

  const healthScore = metrics?.healthScore ?? 0;
  const overdue = metrics?.overdueCount ?? 0;
  const atRisk = metrics?.atRiskCount ?? 0;
  const totalCommitments =
    metrics?.teamBreakdown.reduce((a: number, b: TeamRow) => a + b.total, 0) ?? 0;
  const completionPct =
    totalCommitments === 0
      ? 100
      : Math.round(
          ((metrics?.teamBreakdown.reduce((a: number, b: TeamRow) => a + b.completedOnTime, 0) ?? 0) /
            Math.max(1, totalCommitments)) *
            100
        );

  const queuePreview = useMemo(() => queueFull.slice(0, 5), [queueFull]);

  const approvalsCount = useMemo(
    () => queueFull.filter((q) => q.kind === "escalate").length,
    [queueFull]
  );
  const pendingSendsCount = useMemo(
    () => queueFull.filter((q) => q.kind === "owner_nudge").length,
    [queueFull]
  );

  const ownersBehind = useMemo(() => {
    const rows = metrics?.teamBreakdown ?? [];
    return [...rows]
      .sort((a, b) => b.overdueCount + (100 - b.completionRate) - (a.overdueCount + (100 - a.completionRate)))
      .slice(0, 6);
  }, [metrics?.teamBreakdown]);

  const chartPoints = useMemo(
    () =>
      trend.slice(-14).map((p) => ({
        label: new Date(p.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        health: typeof p.health_score === "number" ? p.health_score : healthScore,
      })),
    [trend, healthScore]
  );

  const attentionTotal = overdue + atRisk + queuePreview.length;

  const summaryLine = useMemo(() => {
    if (attentionTotal === 0) {
      return `Team health score is ${healthScore}. Nothing urgent right now — check the Agent if you want to get ahead of deadlines.`;
    }
    return `${attentionTotal} items need attention (${overdue} late, ${atRisk} due soon, ${queuePreview.length} in the Agent inbox). Team health ${healthScore}.`;
  }, [attentionTotal, healthScore, overdue, atRisk, queuePreview.length]);

  const sectionOrder = useMemo(
    () => normalizeDashboardSectionOrder(prefs.dashboardSectionOrder),
    [prefs.dashboardSectionOrder]
  );

  const shellGap = prefs.commandCenterDensity === "compact" ? "space-y-3 pb-5" : "space-y-5 pb-6";

  const pinnedKeys = prefs.pinnedCommandActions ?? ["queue", "escalations", "activity"];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-400" />
      </div>
    );
  }

  if (isEmployeePreview && scope === "self") {
    return (
      <div
        className={`mx-auto w-full max-w-[min(100%,1720px)] animate-[route5-page-enter_0.35s_ease-out_both] ${shellGap}`}
      >
        <WelcomeHeroCard
          prefs={prefs}
          now={now}
          firstName={firstName}
          roleLabel="My work"
          summaryLine=""
          omitOperationalChrome
          showAvatarStrip={false}
          compact={prefs.commandCenterDensity === "compact"}
          counts={{
            overdue: 0,
            atRisk: 0,
            blockers: 0,
            approvals: 0,
            pendingSends: 0,
          }}
        />
        <EmployeePreviewPanel />
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-[min(100%,1720px)] animate-[route5-page-enter_0.35s_ease-out_both] ${shellGap}`}
    >
      <WelcomeHeroCard
        prefs={prefs}
        now={now}
        firstName={firstName}
        roleLabel={roleLabel}
        summaryLine={summaryLine}
        showAvatarStrip={false}
        compact={prefs.commandCenterDensity === "compact"}
        counts={{
          overdue,
          atRisk,
          blockers: escalations.length,
          approvals: approvalsCount,
          pendingSends: pendingSendsCount,
        }}
      />

      {canOrg && !isEmployeePreview ? (
        <DashboardActionQueuePreview
          agentHref={agentHref}
          queuePreview={queuePreview}
          pendingSendsCount={pendingSendsCount}
          onOpenRunAgent={() => openRunAgent()}
        />
      ) : null}

      {sectionOrder.map((sid) => (
        <SectionFragment
          key={sid}
          sectionId={sid}
          pinnedKeys={pinnedKeys}
          attentionTotal={attentionTotal}
          overdue={overdue}
          atRisk={atRisk}
          queuePreviewLen={queuePreview.length}
          healthScore={healthScore}
          completionPct={completionPct}
          chartPoints={chartPoints}
          ownersBehind={ownersBehind}
          escalations={escalations}
          activity={activity}
        />
      ))}
    </div>
  );
}

function DashboardActionQueuePreview({
  agentHref,
  queuePreview,
  pendingSendsCount,
  onOpenRunAgent,
}: {
  agentHref: string;
  queuePreview: QueueAction[];
  pendingSendsCount: number;
  onOpenRunAgent: () => void;
}) {
  return (
    <section className="rounded-[22px] border border-cyan-500/18 bg-[linear-gradient(165deg,rgba(8,36,42,0.55),rgba(5,12,16,0.96))] px-4 py-4 backdrop-blur-md sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200/55">Do this next</p>
          <h2 className="mt-1 text-base font-semibold text-white">Triage the Agent inbox</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-white/48">
            Pending sends:{" "}
            <span className="font-semibold tabular-nums text-emerald-200/95">{pendingSendsCount}</span> · Review nudges and
            approvals before they go out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenRunAgent}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-950/45 px-4 py-2 text-[12px] font-semibold text-emerald-50 shadow-[0_12px_36px_-18px_rgba(16,185,129,0.35)]"
          >
            Run Agent
          </button>
          <Link
            href={agentHref}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-cyan-500/38 bg-cyan-950/45 px-4 py-2 text-[12px] font-semibold text-cyan-50 shadow-[0_12px_36px_-18px_rgba(8,145,178,0.38)]"
          >
            Open full queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {queuePreview.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/[0.12] bg-black/25 px-4 py-8 text-center text-[13px] text-white/45 md:col-span-2">
            Nothing queued — open the Agent and run a scan.
          </li>
        ) : (
          queuePreview.map((q) => (
            <li
              key={`${q.kind}-${q.commitmentId}`}
              className="rounded-xl border border-white/[0.07] bg-black/28 px-3 py-3"
            >
              <p className="text-[13px] font-semibold leading-snug text-white">{q.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/48">{q.message}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-400/78">
                {q.kind === "owner_nudge" ? "Reminder" : "Escalate"} · {q.severity}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

type SectionFragmentProps = {
  sectionId: string;
  pinnedKeys: string[];
  attentionTotal: number;
  overdue: number;
  atRisk: number;
  queuePreviewLen: number;
  healthScore: number;
  completionPct: number;
  chartPoints: { label: string; health: number }[];
  ownersBehind: TeamRow[];
  escalations: EscalationRow[];
  activity: ActivityRow[];
};

function SectionFragment({
  sectionId,
  pinnedKeys,
  attentionTotal,
  overdue,
  atRisk,
  queuePreviewLen,
  healthScore,
  completionPct,
  chartPoints,
  ownersBehind,
  escalations,
  activity,
}: SectionFragmentProps) {
  switch (sectionId) {
    case "attention":
      return (
        <section className="rounded-[24px] border border-white/[0.06] bg-black/22 px-5 py-4 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">Do this next</p>
              <p className="mt-1 text-sm font-medium leading-snug text-white">
                {attentionTotal === 0
                  ? "Nothing urgent on the radar — use Agent to stay ahead of deadlines."
                  : `${attentionTotal} items need your attention.`}
              </p>
              {pinnedKeys.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                  {pinnedKeys.map((key) => {
                    const def = PINNED_ACTIONS[key];
                    if (!def) return null;
                    const Icon = def.icon;
                    return (
                      <Link
                        key={key}
                        href={def.href}
                        className="route5-pressable inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-100/50 transition hover:text-white"
                      >
                        <Icon className="h-3.5 w-3.5 opacity-85" strokeWidth={2} />
                        {def.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Link
              href="/workspace/agent"
              className="route5-pressable inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-900/38"
            >
              Open Agent <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <AttentionChip href="/workspace/agent" icon={AlertTriangle} label={`${overdue + atRisk} need attention`} tone="warn" />
            <AttentionChip href="/workspace/agent" icon={Bot} label={`${queuePreviewLen} in Agent`} tone="accent" />
            <AttentionChip href="/workspace/activity" icon={ClipboardCheck} label="History" tone="neutral" />
          </div>
        </section>
      );
    case "insights":
      return (
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr] xl:gap-4">
          <section className="rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,24,28,0.88),rgba(6,14,18,0.94))] p-5 shadow-inner shadow-black/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Track how the team is doing</h2>
                <p className="mt-1 text-xs text-white/45">
                  Health score over the last {chartPoints.length || "…"} days
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-emerald-300/90">
                {completionPct}% finished on time
              </span>
            </div>
            <div className="mt-4 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints.length ? chartPoints : [{ label: "—", health: healthScore }]}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "rgba(12,18,14,0.96)",
                      border: "1px solid rgba(52,211,153,0.25)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.65)" }}
                  />
                  <Line type="monotone" dataKey="health" stroke="#2dd4bf" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#5eead4" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,24,28,0.88),rgba(6,14,18,0.94))] p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400/65" />
              <h2 className="text-sm font-semibold text-white">See who needs backup</h2>
            </div>
            <p className="mt-1 text-xs text-white/45">People with the most late work or slipping deadlines</p>
            <ul className="mt-4 space-y-2">
              {ownersBehind.length === 0 ? (
                <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-white/45">
                  No owner data yet.
                </li>
              ) : (
                ownersBehind.map((row: TeamRow) => (
                  <li
                    key={row.ownerId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-950/65 text-xs font-semibold text-cyan-100">
                        {initials(row.displayName)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{row.displayName}</p>
                        <p className="text-[11px] text-white/45">
                          {row.overdueCount} overdue · {row.completionRate}% on-time
                        </p>
                      </div>
                    </div>
                    <Link href={`/workspace/agent`} className="text-[11px] font-medium text-cyan-400 hover:text-cyan-200">
                      Assist
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      );
    case "operations":
      return (
        <section className="rounded-[22px] border border-amber-500/14 bg-[linear-gradient(160deg,rgba(28,22,14,0.35),rgba(8,14,18,0.92))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400/90" />
              <h2 className="text-sm font-semibold text-white">Review raised issues</h2>
            </div>
            <Link href="/workspace/escalations" className="text-[11px] font-semibold text-amber-300/90 hover:text-amber-200">
              View all →
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {escalations.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-6 text-center text-sm text-white/45 sm:col-span-2">
                No open issues.
              </li>
            ) : (
              escalations.slice(0, 8).map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{e.commitmentTitle}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {e.ownerDisplayName} · {e.severity} · open {e.ageHours}h
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      );
    case "movement":
      return (
        <section className="rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,24,28,0.88),rgba(6,12,18,0.94))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Catch up on recent updates</h2>
            <Link href="/workspace/commitments" className="text-xs font-semibold text-white/55 hover:text-white">
              All commitments →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/40">
                  <th className="pb-2 font-medium">Work item</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(activity.length === 0 ? [] : activity.slice(0, 8)).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-white/85">
                    <td className="py-2.5 pr-3 font-medium text-white">{row.title}</td>
                    <td className="py-2.5 text-white/55">{row.owner_name}</td>
                    <td className="py-2.5 text-cyan-200/85">{row.status.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">No recent activity.</p>
            ) : null}
          </div>
        </section>
      );
    default:
      return null;
  }
}

function AttentionChip({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "warn" | "accent" | "neutral";
}) {
  const tones = {
    warn: "border-amber-500/25 bg-amber-950/35 text-amber-100",
    accent: "border-cyan-500/22 bg-cyan-950/40 text-cyan-50",
    neutral: "border-white/[0.08] bg-white/[0.04] text-white/72",
  };
  return (
    <Link
      href={href}
      className={`route5-pressable inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5 opacity-90" />
      {label}
    </Link>
  );
}
