"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  AlertTriangle,
  Bot,
  ClipboardCheck,
  Flame,
  Gauge,
  MapPin,
  ShieldAlert,
  Signal,
  TrendingUp,
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

export default function AdminCommandCenter() {
  const { user } = useUser();
  const { orgRole } = useWorkspaceData();
  const search = useSearchParams();
  const viewParam = search.get("view");
  const canOrg = orgRole === "admin" || orgRole === "manager";
  const isEmployeePreview = viewParam === "employee" || (!canOrg && viewParam !== "admin");

  const scope: Scope = isEmployeePreview ? "self" : "org";

  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [queuePreview, setQueuePreview] = useState<QueueAction[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "there";

  const load = useCallback(async () => {
    setLoading(true);
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
        setQueuePreview(qRes.ok ? (qJson.actions ?? []).slice(0, 5) : []);
      } else {
        setEscalations([]);
        setQueuePreview([]);
      }
    } finally {
      setLoading(false);
    }
  }, [scope, canOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  const healthScore = metrics?.healthScore ?? 0;
  const overdue = metrics?.overdueCount ?? 0;
  const atRisk = metrics?.atRiskCount ?? 0;
  const onTrack = metrics?.onTrackCount ?? 0;
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  if (isEmployeePreview && scope === "self") {
    return <EmployeePreviewPanel />;
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-4 pb-6 animate-[route5-page-enter_0.35s_ease-out_both]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/15 bg-[linear-gradient(135deg,rgba(15,35,22,0.95)_0%,rgba(8,12,10,0.98)_45%,rgba(10,24,18,0.92)_100%)] p-6 shadow-[0_32px_100px_-56px_rgba(16,185,129,0.45)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/85">
              Route5 · Admin command center
            </p>
            <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-500/70" />
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Signal className="h-4 w-4 text-emerald-500/70" />
                Execution health {healthScore}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <AttentionChip href="/workspace/agent" icon={AlertTriangle} label={`${overdue + atRisk} need attention`} tone="warn" />
              <AttentionChip href="/workspace/agent" icon={Bot} label={`${queuePreview.length} in recovery queue`} tone="accent" />
              <AttentionChip href="/workspace/activity" icon={ClipboardCheck} label="Activity log" tone="neutral" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <StatTile icon={AlertTriangle} label="Overdue" value={overdue} highlight={overdue > 0} />
            <StatTile icon={ShieldAlert} label="At risk" value={atRisk} highlight={atRisk > 0} />
            <StatTile icon={TrendingUp} label="On track" value={onTrack} />
            <StatTile icon={Gauge} label="Health" value={`${healthScore}`} />
          </div>
        </div>
        <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                Today&apos;s priority
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {attentionTotal === 0
                  ? "Nothing critical blocking execution — stay ahead with the recovery queue."
                  : `${attentionTotal} items require executive attention before end of day.`}
              </p>
            </div>
            <Link
              href="/workspace/agent"
              className="route5-pressable inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/35"
            >
              Open action queue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Trend */}
        <section className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,17,0.95),rgba(8,11,9,0.92))] p-5 shadow-inner shadow-black/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Execution trend</h2>
              <p className="mt-1 text-xs text-white/45">Workload vs. health signals — last {chartPoints.length || "…"} days</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-emerald-300/90">
              {completionPct}% completion (rolling)
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
                <Line type="monotone" dataKey="health" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6ee7b7" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Owners behind */}
        <section className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,17,0.95),rgba(8,11,9,0.92))] p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500/70" />
            <h2 className="text-sm font-semibold text-white">Owners behind</h2>
          </div>
          <p className="mt-1 text-xs text-white/45">Sorted by overdue exposure and completion gap</p>
          <ul className="mt-4 space-y-2">
            {ownersBehind.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-white/45">
                No team breakdown yet.
              </li>
            ) : (
              ownersBehind.map((row: TeamRow) => (
                <li
                  key={row.ownerId}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-950/80 text-xs font-semibold text-emerald-200">
                      {initials(row.displayName)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{row.displayName}</p>
                      <p className="text-[11px] text-white/45">
                        {row.overdueCount} overdue · {row.completionRate}% on-time
                      </p>
                    </div>
                  </div>
                  <Link href={`/workspace/agent`} className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300">
                    Queue
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[22px] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(35,28,14,0.5),rgba(12,14,11,0.92))] p-5">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400/90" />
            <h2 className="text-sm font-semibold text-white">Blockers & escalations</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {escalations.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-center text-sm text-white/45">
                No open escalations.
              </li>
            ) : (
              escalations.slice(0, 6).map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{e.commitmentTitle}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {e.ownerDisplayName} · {e.severity} · open {e.ageHours}h
                  </p>
                </li>
              ))
            )}
          </ul>
          <Link href="/workspace/escalations" className="route5-pressable mt-3 inline-flex text-xs font-semibold text-amber-300/90 hover:text-amber-200">
            View all escalations →
          </Link>
        </section>

        <section className="rounded-[22px] border border-emerald-500/15 bg-[linear-gradient(135deg,rgba(14,35,26,0.55),rgba(10,12,11,0.92))] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400/90" />
              <h2 className="text-sm font-semibold text-white">Recovery queue preview</h2>
            </div>
            <Link href="/workspace/agent" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Full inbox
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {queuePreview.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-center text-sm text-white/45">
                Queue empty — run recovery scan from Action Queue when ready.
              </li>
            ) : (
              queuePreview.map((q) => (
                <li key={`${q.kind}-${q.commitmentId}`} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{q.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-white/50">{q.message}</p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-emerald-500/80">
                    {q.kind.replace("_", " ")} · {q.severity}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Recent commitments */}
      <section className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,17,0.95),rgba(8,11,9,0.92))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Latest commitment movement</h2>
          <Link href="/workspace/commitments" className="text-xs font-semibold text-white/55 hover:text-white">
            All commitments →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/40">
                <th className="pb-2 font-medium">Commitment</th>
                <th className="pb-2 font-medium">Owner</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(activity.length === 0 ? [] : activity.slice(0, 8)).map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-white/85">
                  <td className="py-2.5 pr-3 font-medium text-white">{row.title}</td>
                  <td className="py-2.5 text-white/55">{row.owner_name}</td>
                  <td className="py-2.5 text-emerald-300/85">{row.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">No recent activity.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
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
    accent: "border-emerald-500/25 bg-emerald-950/40 text-emerald-100",
    neutral: "border-white/15 bg-white/5 text-white/75",
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

function StatTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        highlight
          ? "border-red-500/35 bg-red-950/30 shadow-[0_0_24px_-12px_rgba(239,68,68,0.35)]"
          : "border-white/10 bg-black/25"
      }`}
    >
      <Icon className={`h-4 w-4 ${highlight ? "text-red-400/90" : "text-emerald-500/65"}`} />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
