/** Pure metrics from org_commitments rows (non-deleted). */

import type { OrgCommitmentRow, OrgCommitmentStatus } from "@/lib/org-commitment-types";
import { computeWorkspaceExecutionHealth } from "@/lib/execution-health";

export type MetricCommitmentRow = {
  id: string;
  status: string;
  deadline: string;
  completed_at: string | null;
  owner_id: string;
  title: string;
  created_at: string;
};

export type EscalationItem = {
  id: string;
  title: string;
  ownerId: string;
  deadline: string;
  severity: "overdue" | "at_risk";
};

export type TeamRow = {
  ownerId: string;
  displayName: string;
  total: number;
  completedOnTime: number;
  completionRate: number;
  overdueCount: number;
};

export type LiveDashboardMetrics = {
  healthScore: number;
  healthTier: "green" | "yellow" | "red";
  activeCount: number;
  onTrackCount: number;
  atRiskCount: number;
  overdueCount: number;
  completedWeekCount: number;
  completedMonthCount: number;
  topEscalations: EscalationItem[];
  teamBreakdown: TeamRow[];
  departmentBreakdown: { id: string; label: string; count: number }[];
};

function parseMs(iso: string): number {
  return new Date(iso).getTime();
}

/** Legacy on-time closure ratio (30-day due window). Kept for analytics; Executive Dashboard uses {@link computeWorkspaceExecutionHealth} via metrics rows. */
export function computeHealthScore(rows: MetricCommitmentRow[], nowMs: number = Date.now()): number {
  const start30 = nowMs - 30 * 24 * 60 * 60 * 1000;
  const dueWindow = rows.filter((r) => {
    const d = parseMs(r.deadline);
    return d >= start30 && d <= nowMs;
  });
  if (dueWindow.length === 0) return 100;
  const onTime = dueWindow.filter((r) => {
    if (!r.completed_at) return false;
    return parseMs(r.completed_at) <= parseMs(r.deadline);
  }).length;
  return Math.round((onTime / dueWindow.length) * 100);
}

const ORG_STATUSES: readonly OrgCommitmentStatus[] = [
  "not_started",
  "in_progress",
  "on_track",
  "at_risk",
  "overdue",
  "completed",
];

function normalizeOrgStatus(raw: string): OrgCommitmentStatus {
  return ORG_STATUSES.includes(raw as OrgCommitmentStatus) ? (raw as OrgCommitmentStatus) : "on_track";
}

/** Maps metric store rows to org commitment shape for shared execution health with Leadership / Overview. */
export function metricRowsToOrgCommitments(rows: MetricCommitmentRow[]): OrgCommitmentRow[] {
  const now = new Date().toISOString();
  return rows.map((r) => ({
    id: r.id,
    orgId: "",
    title: r.title,
    description: null,
    ownerId: r.owner_id,
    projectId: null,
    deadline: r.deadline,
    priority: "medium",
    status: normalizeOrgStatus(r.status),
    createdAt: r.created_at,
    updatedAt: now,
    completedAt: r.completed_at,
    lastActivityAt: r.created_at,
    deletedAt: null,
  }));
}

export function healthTier(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

export function computeLiveDashboardMetrics(
  rows: MetricCommitmentRow[],
  ownerDisplayNames: Map<string, string>,
  nowMs: number = Date.now()
): LiveDashboardMetrics {
  const active = rows.filter((r) => !r.completed_at);
  const healthScore = computeWorkspaceExecutionHealth(metricRowsToOrgCommitments(rows));

  const weekStart = new Date(nowMs);
  weekStart.setUTCHours(0, 0, 0, 0);
  const dow = weekStart.getUTCDay();
  const diff = (dow + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const monthStart = new Date(Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth() + 1, 1));

  const completedWeek = rows.filter((r) => {
    if (!r.completed_at) return false;
    const t = parseMs(r.completed_at);
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  }).length;

  const completedMonth = rows.filter((r) => {
    if (!r.completed_at) return false;
    const t = parseMs(r.completed_at);
    return t >= monthStart.getTime() && t < monthEnd.getTime();
  }).length;

  /** Real escalations load from GET /api/escalations (org_escalations). */
  const escalations: EscalationItem[] = [];

  const byOwner = new Map<string, MetricCommitmentRow[]>();
  for (const r of rows) {
    const list = byOwner.get(r.owner_id) ?? [];
    list.push(r);
    byOwner.set(r.owner_id, list);
  }

  const teamBreakdown: TeamRow[] = [];
  for (const [ownerId, list] of byOwner) {
    const total = list.length;
    const completedOnTime = list.filter((r) => {
      if (!r.completed_at) return false;
      return parseMs(r.completed_at) <= parseMs(r.deadline);
    }).length;
    const overdueCount = list.filter((r) => !r.completed_at && r.status === "overdue").length;
    const rate = total === 0 ? 100 : Math.round((completedOnTime / total) * 100);
    teamBreakdown.push({
      ownerId,
      displayName: ownerDisplayNames.get(ownerId) ?? ownerId.slice(-8),
      total,
      completedOnTime,
      completionRate: rate,
      overdueCount,
    });
  }
  teamBreakdown.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    healthScore,
    healthTier: healthTier(healthScore),
    activeCount: active.length,
    onTrackCount: active.filter((r) => r.status === "on_track").length,
    atRiskCount: active.filter((r) => r.status === "at_risk").length,
    overdueCount: active.filter((r) => r.status === "overdue").length,
    completedWeekCount: completedWeek,
    completedMonthCount: completedMonth,
    topEscalations: escalations,
    teamBreakdown,
    departmentBreakdown: [],
  };
}

export type VelocityWeek = { weekStart: string; weekLabel: string; count: number };

/** Last 12 weeks, UTC Monday week boundaries, by created_at. */
export function computeVelocityWeeks(rows: MetricCommitmentRow[], nowMs: number = Date.now()): VelocityWeek[] {
  const out: VelocityWeek[] = [];
  const now = new Date(nowMs);
  for (let w = 11; w >= 0; w--) {
    const end = new Date(now);
    end.setUTCHours(0, 0, 0, 0);
    const dow = end.getUTCDay();
    const diff = (dow + 6) % 7;
    end.setUTCDate(end.getUTCDate() - diff - w * 7);
    const start = new Date(end);
    const weekEnd = new Date(end);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const count = rows.filter((r) => {
      const t = parseMs(r.created_at);
      return t >= start.getTime() && t < weekEnd.getTime();
    }).length;
    out.push({
      weekStart: start.toISOString(),
      weekLabel: `${start.getUTCMonth() + 1}/${start.getUTCDate()}`,
      count,
    });
  }
  return out;
}

/** Row for execution_snapshots upsert (aligned with compute_execution_snapshot SQL). */
export function computeSnapshotPayload(
  rows: MetricCommitmentRow[],
  nowMs: number = Date.now()
): {
  health_score: number;
  active_count: number;
  on_track_count: number;
  at_risk_count: number;
  overdue_count: number;
  completed_week_count: number;
  completed_month_count: number;
  snapshot_date: string;
} {
  const m = computeLiveDashboardMetrics(rows, new Map(), nowMs);
  const snapshot_date = new Date(nowMs).toISOString().slice(0, 10);
  return {
    health_score: m.healthScore,
    active_count: m.activeCount,
    on_track_count: m.onTrackCount,
    at_risk_count: m.atRiskCount,
    overdue_count: m.overdueCount,
    completed_week_count: m.completedWeekCount,
    completed_month_count: m.completedMonthCount,
    snapshot_date,
  };
}
