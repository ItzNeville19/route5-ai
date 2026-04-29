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
import { useI18n } from "@/components/i18n/I18nProvider";

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

const HEALTH_CHART_DAYS = 14;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHealthChartSeries(
  trend: TrendPoint[],
  fallbackHealth: number,
  dayCount: number,
  intlLocale: string
): { label: string; health: number }[] {
  const byDate = new Map<string, number>();
  for (const p of trend) {
    const key = p.snapshot_date?.slice(0, 10);
    if (!key) continue;
    if (typeof p.health_score === "number" && !Number.isNaN(p.health_score)) {
      byDate.set(key, Math.max(0, Math.min(100, Math.round(p.health_score))));
    }
  }

  const out: { label: string; health: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let lastHealth = Math.max(0, Math.min(100, Math.round(fallbackHealth)));

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = localDateKey(d);
    const v = byDate.get(dateKey);
    if (v !== undefined) lastHealth = v;
    out.push({
      label: d.toLocaleDateString(intlLocale, { month: "short", day: "numeric" }),
      health: lastHealth,
    });
  }
  return out;
}

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

const PINNED_ACTION_DEFS: Record<string, { href: string; labelKey: string; icon: LucideIcon }> = {
  queue: { href: "/workspace/agent", labelKey: "dashboard.lead.pinned.agent", icon: Bot },
  escalations: { href: "/workspace/escalations", labelKey: "dashboard.lead.pinned.issues", icon: Flame },
  activity: { href: "/workspace/activity", labelKey: "dashboard.lead.pinned.history", icon: ClipboardCheck },
  commitments: { href: "/workspace/commitments", labelKey: "dashboard.lead.pinned.commitments", icon: ClipboardCheck },
  customize: { href: "/workspace/customize", labelKey: "dashboard.lead.pinned.customize", icon: LayoutGrid },
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
  const { t, intlLocale } = useI18n();
  const { user } = useUser();
  const { orgRole, organizationId, activeProjectId } = useWorkspaceData();
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
  const [ownerAvatars, setOwnerAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const minuteTick = useAlignedMinuteTick();
  const now = useMemo(() => new Date(), [minuteTick]);

  const firstName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    t("dashboard.lead.welcome.there");

  const roleLabel = useMemo(() => {
    if (orgRole === "admin") return t("dashboard.lead.role.admin");
    if (orgRole === "manager") return t("dashboard.lead.role.manager");
    if (orgRole === "member") return t("dashboard.lead.role.member");
    return t("dashboard.lead.role.workspace");
  }, [orgRole, t]);

  const load = useCallback(async (quiet?: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const projectQs = activeProjectId
        ? `&projectId=${encodeURIComponent(activeProjectId)}`
        : "";
      const qs = `?scope=${scope}${projectQs}`;
      const [mRes, aRes, tRes] = await Promise.all([
        fetch(`/api/dashboard/metrics${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/activity${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/trend${qs}&range=30d`, { credentials: "same-origin" }),
      ]);

      let eRes: Response | undefined;
      let qRes: Response | undefined;
      if (scope === "org" && canOrg) {
        const escUrl = `/api/escalations?resolved=open&limit=12${projectQs}`;
        const previewUrl = activeProjectId
          ? `/api/agent/commitment-ops/preview?projectId=${encodeURIComponent(activeProjectId)}`
          : "/api/agent/commitment-ops/preview";
        [eRes, qRes] = await Promise.all([
          fetch(escUrl, { credentials: "same-origin" }),
          fetch(previewUrl, { credentials: "same-origin" }),
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
  }, [scope, canOrg, activeProjectId]);

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

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspace/collaborators", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as { collaborators?: { userId: string; imageUrl: string | null }[] };
        if (cancelled) return;
        const m: Record<string, string> = {};
        for (const c of data.collaborators ?? []) {
          if (c.imageUrl) m[c.userId] = c.imageUrl;
        }
        setOwnerAvatars(m);
      } catch {
        /* best-effort avatars */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

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
    const needing = rows.filter((r) => r.overdueCount > 0 || r.atRiskCount > 0);
    return [...needing]
      .sort(
        (a, b) =>
          b.overdueCount +
          b.atRiskCount +
          (100 - b.completionRate) -
          (a.overdueCount + a.atRiskCount + (100 - a.completionRate))
      )
      .slice(0, 6)
      .map((r) => ({ ...r, imageUrl: ownerAvatars[r.ownerId] }));
  }, [metrics?.teamBreakdown, ownerAvatars]);

  const chartPoints = useMemo(
    () => buildHealthChartSeries(trend, healthScore, HEALTH_CHART_DAYS, intlLocale),
    [trend, healthScore, intlLocale]
  );

  const attentionTotal = overdue + atRisk + queuePreview.length;

  const summaryLine = useMemo(() => {
    if (attentionTotal === 0) {
      return t("dashboard.lead.hero.summaryClear", { health: healthScore });
    }
    return t("dashboard.lead.hero.summaryBusy", {
      total: attentionTotal,
      overdue,
      atRisk,
      queue: queuePreview.length,
      health: healthScore,
    });
  }, [attentionTotal, healthScore, overdue, atRisk, queuePreview.length, t]);

  const sectionOrder = useMemo(
    () => normalizeDashboardSectionOrder(prefs.dashboardSectionOrder),
    [prefs.dashboardSectionOrder]
  );

  const shellGap = prefs.commandCenterDensity === "compact" ? "space-y-3 pb-5" : "space-y-5 pb-6";

  const pinnedKeys = prefs.pinnedCommandActions ?? ["queue", "escalations", "activity"];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-400"
          aria-label={t("dashboard.lead.loading")}
        />
        <span className="sr-only">{t("dashboard.lead.loading")}</span>
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
          roleLabel={t("dashboard.lead.welcome.myWork")}
          summaryLine=""
          omitOperationalChrome
          showAvatarStrip={Boolean(user?.imageUrl)}
          avatarUrls={user?.imageUrl ? [user.imageUrl] : []}
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
  const { t } = useI18n();
  return (
    <section className="rounded-[22px] border border-cyan-500/18 bg-[linear-gradient(165deg,rgba(8,36,42,0.55),rgba(5,12,16,0.96))] px-4 py-4 backdrop-blur-md sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200/55">
            {t("dashboard.lead.inbox.kicker")}
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">{t("dashboard.lead.inbox.title")}</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-white/48">
            {t("dashboard.lead.inbox.pending", { count: pendingSendsCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenRunAgent}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-950/45 px-4 py-2 text-[12px] font-semibold text-emerald-50 shadow-[0_12px_36px_-18px_rgba(16,185,129,0.35)]"
          >
            {t("dashboard.lead.inbox.runAgent")}
          </button>
          <Link
            href={agentHref}
            className="route5-pressable inline-flex items-center gap-2 rounded-full border border-cyan-500/38 bg-cyan-950/45 px-4 py-2 text-[12px] font-semibold text-cyan-50 shadow-[0_12px_36px_-18px_rgba(8,145,178,0.38)]"
          >
            {t("dashboard.lead.inbox.openQueue")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {queuePreview.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/[0.12] bg-black/25 px-4 py-8 text-center text-[13px] text-white/45 md:col-span-2">
            {t("dashboard.lead.inbox.empty")}
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
                {q.kind === "owner_nudge"
                  ? t("dashboard.lead.inbox.kindReminder")
                  : t("dashboard.lead.inbox.kindEscalate")}{" "}
                · {q.severity}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

type OwnerRow = TeamRow & { imageUrl?: string };

type SectionFragmentProps = {
  sectionId: string;
  pinnedKeys: string[];
  attentionTotal: number;
  overdue: number;
  atRisk: number;
  queuePreviewLen: number;
  completionPct: number;
  chartPoints: { label: string; health: number }[];
  ownersBehind: OwnerRow[];
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
  completionPct,
  chartPoints,
  ownersBehind,
  escalations,
  activity,
}: SectionFragmentProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const activityHref = useMemo(() => {
    const q = searchParams.toString();
    return q ? `/workspace/activity?${q}` : "/workspace/activity";
  }, [searchParams]);

  switch (sectionId) {
    case "attention":
      return (
        <section className="rounded-[24px] border border-white/[0.06] bg-black/22 px-5 py-4 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">
                {t("dashboard.lead.attention.kicker")}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-white">
                {attentionTotal === 0
                  ? t("dashboard.lead.attention.radarClear")
                  : t("dashboard.lead.attention.needCount", { count: attentionTotal })}
              </p>
              {pinnedKeys.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                  {pinnedKeys.map((key) => {
                    const def = PINNED_ACTION_DEFS[key];
                    if (!def) return null;
                    const Icon = def.icon;
                    return (
                      <Link
                        key={key}
                        href={def.href}
                        className="route5-pressable inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-100/50 transition hover:text-white"
                      >
                        <Icon className="h-3.5 w-3.5 opacity-85" strokeWidth={2} />
                        {t(def.labelKey)}
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
              {t("dashboard.lead.attention.openAgent")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <AttentionChip
              href="/workspace/agent"
              icon={AlertTriangle}
              label={t("dashboard.lead.chip.needCount", { count: overdue + atRisk })}
              tone="warn"
            />
            <AttentionChip
              href="/workspace/agent"
              icon={Bot}
              label={t("dashboard.lead.chip.inAgentCount", { count: queuePreviewLen })}
              tone="accent"
            />
            <AttentionChip
              href="/workspace/activity"
              icon={ClipboardCheck}
              label={t("dashboard.lead.chip.history")}
              tone="neutral"
            />
          </div>
        </section>
      );
    case "insights":
      return (
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr] xl:gap-4">
          <section className="rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,24,28,0.88),rgba(6,14,18,0.94))] p-5 shadow-inner shadow-black/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">{t("dashboard.lead.insights.title")}</h2>
                <p className="mt-1 text-xs text-white/45">
                  {t("dashboard.lead.insights.subtitle", { days: HEALTH_CHART_DAYS })}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-emerald-300/90">
                {t("dashboard.lead.insights.badge", { pct: completionPct })}
              </span>
            </div>
            <div className="mt-4 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    width={36}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: t("dashboard.lead.insights.healthAxis"),
                      angle: -90,
                      position: "insideLeft",
                      fill: "rgba(255,255,255,0.35)",
                      fontSize: 10,
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [
                      String(value ?? "—"),
                      t("dashboard.lead.insights.healthAxis"),
                    ]}
                    contentStyle={{
                      background: "rgba(12,18,14,0.96)",
                      border: "1px solid rgba(52,211,153,0.25)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.65)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="health"
                    name={t("dashboard.lead.insights.healthAxis")}
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={{ r: 2.5, strokeWidth: 1, fill: "#14b8a6" }}
                    activeDot={{ r: 5, fill: "#5eead4" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-white/35">{t("dashboard.lead.insights.footnote")}</p>
          </section>

          <section className="rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,24,28,0.88),rgba(6,14,18,0.94))] p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400/65" />
              <h2 className="text-sm font-semibold text-white">{t("dashboard.lead.owners.title")}</h2>
            </div>
            <p className="mt-1 text-xs text-white/45">{t("dashboard.lead.owners.subtitle")}</p>
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <p className="text-[10px] leading-snug text-white/35 sm:max-w-[20rem]">
                {t("dashboard.lead.owners.viewHistorySub")}
              </p>
              <Link
                href={activityHref}
                className="shrink-0 text-[11px] font-semibold text-cyan-400/90 transition hover:text-cyan-200"
              >
                {t("dashboard.lead.owners.viewHistory")} →
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {ownersBehind.length === 0 ? (
                <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-white/45">
                  {t("dashboard.lead.owners.empty")}
                </li>
              ) : (
                ownersBehind.map((row: OwnerRow) => (
                  <li
                    key={row.ownerId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-950/65 text-xs font-semibold text-cyan-100 ring-1 ring-white/10">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          initials(row.displayName)
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{row.displayName}</p>
                        <p className="text-[11px] text-white/45">
                          {t("dashboard.lead.owners.line", {
                            overdue: row.overdueCount,
                            rate: row.completionRate,
                          })}
                        </p>
                      </div>
                    </div>
                    <Link href={`/workspace/agent`} className="text-[11px] font-medium text-cyan-400 hover:text-cyan-200">
                      {t("dashboard.lead.owners.assist")}
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
              <h2 className="text-sm font-semibold text-white">{t("dashboard.lead.ops.title")}</h2>
            </div>
            <Link href="/workspace/escalations" className="text-[11px] font-semibold text-amber-300/90 hover:text-amber-200">
              {t("dashboard.lead.ops.viewAll")}
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {escalations.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-6 text-center text-sm text-white/45 sm:col-span-2">
                {t("dashboard.lead.ops.empty")}
              </li>
            ) : (
              escalations.slice(0, 8).map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{e.commitmentTitle}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {t("dashboard.lead.ops.rowMeta", {
                      owner: e.ownerDisplayName,
                      severity: e.severity,
                      hours: e.ageHours,
                    })}
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
            <h2 className="text-sm font-semibold text-white">{t("dashboard.lead.movement.title")}</h2>
            <Link href="/workspace/commitments" className="text-xs font-semibold text-white/55 hover:text-white">
              {t("dashboard.lead.movement.link")}
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/40">
                  <th className="pb-2 font-medium">{t("dashboard.lead.movement.th.item")}</th>
                  <th className="pb-2 font-medium">{t("dashboard.lead.movement.th.owner")}</th>
                  <th className="pb-2 font-medium">{t("dashboard.lead.movement.th.status")}</th>
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
              <p className="py-8 text-center text-sm text-white/45">{t("dashboard.lead.movement.empty")}</p>
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
