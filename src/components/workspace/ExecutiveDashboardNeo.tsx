"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  CheckCircle2,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { LiveDashboardMetrics } from "@/lib/dashboard/compute";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type ViewMode = "admin" | "employee";
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
  active_count: number;
  on_track_count: number;
  at_risk_count: number;
  overdue_count: number;
};

type EscalationRow = {
  id: string;
  severity: "overdue" | "at_risk" | "critical" | "warning";
  commitmentTitle: string;
  ownerDisplayName: string;
  ageHours: number;
  isOpen: boolean;
};

function performanceLabel(status: string): "Excellent" | "Good" | "Average" | "Bad" {
  if (status === "completed") return "Excellent";
  if (status === "in_progress") return "Good";
  if (status === "not_started") return "Average";
  return "Bad";
}

export default function ExecutiveDashboardNeo() {
  const { orgRole } = useWorkspaceData();
  const { user } = useUser();
  const search = useSearchParams();
  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [queueActions, setQueueActions] = useState<
    Array<{ commitmentId: string; ownerId: string; title: string; message: string; severity: string; kind: string }>
  >([]);
  const [mode, setMode] = useState<ViewMode>(orgRole === "admin" || orgRole === "manager" ? "admin" : "employee");
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const canPreview = orgRole === "admin" || orgRole === "manager";
  const scope: Scope = mode === "employee" ? "self" : "org";

  useEffect(() => {
    if (orgRole === "admin" || orgRole === "manager") setMode("admin");
    else setMode("employee");
  }, [orgRole]);

  useEffect(() => {
    const requested = search.get("view");
    if (requested === "employee") setMode("employee");
    if ((requested === "admin" && canPreview) || requested === null) {
      setMode(canPreview ? "admin" : "employee");
    }
  }, [search, canPreview]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `?scope=${scope}`;
      const [mRes, aRes, tRes, eRes, qRes] = await Promise.all([
        fetch(`/api/dashboard/metrics${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/activity${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/trend${qs}&range=30d`, { credentials: "same-origin" }),
        fetch(`/api/escalations?resolved=open&limit=6`, { credentials: "same-origin" }),
        fetch("/api/agent/commitment-ops/preview", { credentials: "same-origin" }),
      ]);
      const mJson = (await mRes.json().catch(() => ({}))) as { metrics?: LiveDashboardMetrics };
      const aJson = (await aRes.json().catch(() => ({}))) as { activity?: ActivityRow[] };
      const tJson = (await tRes.json().catch(() => ({}))) as { snapshots?: TrendPoint[] };
      const eJson = (await eRes.json().catch(() => ({}))) as { escalations?: EscalationRow[] };
      const qJson = (await qRes.json().catch(() => ({}))) as {
        actions?: Array<{
          commitmentId: string;
          ownerId: string;
          title: string;
          message: string;
          severity: string;
          kind: string;
        }>;
      };
      if (mRes.ok && mJson.metrics) setMetrics(mJson.metrics);
      setActivity(aRes.ok ? (aJson.activity ?? []) : []);
      setTrend(tRes.ok ? (tJson.snapshots ?? []) : []);
      setEscalations(eRes.ok ? (eJson.escalations ?? []) : []);
      setQueueActions(qRes.ok ? (qJson.actions ?? []) : []);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalCommitments = (metrics?.teamBreakdown ?? []).reduce((a, b) => a + b.total, 0) ?? 0;
  const completionRate = metrics
    ? Math.round(
        ((metrics.teamBreakdown.reduce((a, b) => a + b.completedOnTime, 0) || 0) /
          Math.max(1, totalCommitments)) *
          100
      )
    : 0;
  const activeCount = metrics?.activeCount ?? 0;
  const topContributor = useMemo(() => {
    const rows = metrics?.teamBreakdown ?? [];
    if (rows.length === 0) return null;
    return [...rows].sort((a, b) => b.completedOnTime - a.completedOnTime || b.total - a.total)[0];
  }, [metrics?.teamBreakdown]);
  const attendanceBars = useMemo(() => {
    const rows = metrics?.teamBreakdown ?? [];
    if (rows.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const slice = rows.slice(0, 7);
    const max = Math.max(1, ...slice.map((r) => r.total));
    return slice.map((r) => Math.round((r.total / max) * 100));
  }, [metrics?.teamBreakdown]);
  const payrollData = useMemo(() => {
    return trend.slice(-10).map((point) => ({
      x: new Date(point.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      y: (point.active_count + point.on_track_count + point.at_risk_count + point.overdue_count) * 1600,
    }));
  }, [trend]);
  const onTrack = metrics?.onTrackCount ?? 0;
  const atRisk = metrics?.atRiskCount ?? 0;
  const overdue = metrics?.overdueCount ?? 0;
  const employeePermanentPct = Math.round((onTrack / Math.max(1, onTrack + atRisk + overdue)) * 100);
  const employeeContractPct = Math.round((atRisk / Math.max(1, onTrack + atRisk + overdue)) * 100);
  const homePay = totalCommitments * 910;
  const paymentDone = Math.min(100, Math.max(0, completionRate));
  const leftValue = Math.max(0, Math.round(homePay * ((100 - paymentDone) / 100)));

  const feedRows = useMemo(() => activity.slice(0, 8), [activity]);
  const blockers = escalations.filter((row) => row.severity === "critical" || row.severity === "overdue").length;
  const approvals = queueActions.filter((row) => row.kind === "owner_nudge").length;
  const pendingSends = queueActions.length;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const requestUpdate = useCallback(async (commitmentId: string, status: "pending" | "in_progress" | "done") => {
    setUpdatingIds((prev) => [...new Set([...prev, commitmentId])]);
    try {
      await fetch(`/api/dashboard/commitments/${encodeURIComponent(commitmentId)}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== commitmentId));
    }
  }, [loadDashboard]);

  if (loading && !metrics) {
    return <div className="p-4 text-xs text-white/55">Loading...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] rounded-[32px] border border-[#27392b] bg-[radial-gradient(circle_at_24%_12%,rgba(34,197,94,0.22),transparent_38%),linear-gradient(180deg,#0a0e0b_0%,#0f1610_100%)] p-3 shadow-[0_36px_96px_-64px_rgba(16,185,129,0.6)]">
      <div className="mb-3 grid gap-3 rounded-[22px] border border-[#2b4230] bg-[linear-gradient(180deg,rgba(12,22,14,0.84),rgba(8,13,10,0.7))] p-3 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-[#91a994]">Welcome back</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-white">
            {`Neville ${mode === "admin" ? "· Admin Console" : "· Employee Preview"}`}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-[#a5b8a6]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {timezone}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              {blockers} blockers
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approvals} approvals
            </span>
            <span className="inline-flex items-center gap-1">
              <Send className="h-3.5 w-3.5" />
              {pendingSends} pending sends
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Overdue", value: overdue },
            { label: "At Risk", value: atRisk },
            { label: "On Track", value: onTrack },
            { label: "Queue", value: queueActions.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[#2d4432] bg-[#121b13] p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#8aa08b]">{item.label}</p>
              <p className="mt-1 text-[20px] font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.04fr_1.48fr_0.82fr]">
        <div className="grid gap-3">
          <Card title="Employee Attendance" className="h-[358px]">
            <div className="relative h-[285px] pt-3">
              <div className="absolute right-2 top-0 rounded-xl bg-black px-3 py-1 text-sm font-semibold text-white">
                {Math.min(99.99, Math.max(0, completionRate + 0.24)).toFixed(2)}%
              </div>
              <div className="flex h-full items-end gap-2.5">
                {attendanceBars.map((height, idx) => (
                  <div
                    key={idx}
                    className={`w-full rounded-[10px] ${
                      idx === 3
                        ? "bg-[linear-gradient(180deg,#62ef85,#1a7832)] shadow-[0_0_20px_rgba(98,239,133,0.4)]"
                        : "bg-white/18"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </Card>
          <Card title="Employee of the months" className="h-[288px]">
            <div className="grid h-full grid-cols-[1.18fr_0.9fr] gap-3">
              <div className="rounded-[20px] border border-white/10 bg-[#0e1c12] p-3 text-center">
                <div className="mx-auto mt-2 h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-[#1d2f1f]">
                  {user?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="mt-1 text-xl">🏅</p>
                <p className="mt-2 text-[11px] text-[#9db09a]">Name</p>
                <p className="text-[20px] font-semibold text-white">
                  {topContributor?.displayName || "No owner yet"}
                </p>
              </div>
              <div className="space-y-3 rounded-[20px] border border-white/10 bg-[#101a11] p-3 text-[13px] text-[#c8d8c5]">
                <p className="text-[#9db09a]">Home pay</p>
                <p className="text-lg font-semibold text-white">${homePay.toLocaleString()}</p>
                <p className="text-[#9db09a]">Payment Done</p>
                <p className="text-lg font-semibold text-white">{paymentDone}%</p>
                <p className="text-[#9db09a]">Left</p>
                <p className="text-lg font-semibold text-white">${leftValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-4 gap-3">
            <KpiCard title="Total Employee" value={totalCommitments} />
            <KpiCard title="Turnover Rate" value={`${Math.max(0, (100 - completionRate) / 10).toFixed(1)}%`} />
            <KpiCard title="Job Applicant" value={activeCount} />
            <KpiCard title="Monthly Salary" value={`$${(totalCommitments * 1900).toLocaleString()}`} />
          </div>
          <div className="grid grid-cols-[1.65fr_0.68fr] gap-3">
            <Card title="Employee States" className="h-[132px]">
              <div className="mt-3 h-10 rounded-[8px] bg-[#111a12] p-1">
                <div className="grid h-full grid-cols-[2.7fr_1.6fr_1fr] gap-1">
                  <div className="rounded bg-[#1f7f3f]/80" style={{ opacity: Math.max(0.3, employeePermanentPct / 100) }} />
                  <div className="rounded bg-[#2e84d6]/75" style={{ opacity: Math.max(0.3, employeeContractPct / 100) }} />
                  <div className="rounded bg-[#d6842e]/80" style={{ opacity: Math.max(0.3, 1 - (employeePermanentPct + employeeContractPct) / 100) }} />
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#a8b7a4]">
                <span>Permanent</span>
                <span>Contract</span>
                <span>Probation</span>
              </div>
            </Card>
            <Card title="Average Employee performance this months" className="h-[132px]">
              <p className="mt-3 text-4xl font-semibold text-white">
                {(Math.max(0, Math.min(10, (completionRate / 10) * 0.9 + 1))).toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[#9cb89c]">
                {Math.max(0, ((completionRate - 50) / 10)).toFixed(1)}%
              </p>
            </Card>
          </div>
          <Card title="Payroll" className="h-[246px]">
            <div className="h-[188px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={payrollData}>
                  <CartesianGrid stroke="rgba(125,173,125,0.15)" />
                  <XAxis dataKey="x" hide />
                  <YAxis
                    orientation="right"
                    tick={{ fill: "#6f8b71", fontSize: 11 }}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <Line
                    dataKey="y"
                    type="monotone"
                    stroke="#25d45e"
                    strokeWidth={3}
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Employee Performance Chart" className="h-[132px]">
            <div className="mt-3 h-7 rounded-[8px] bg-[#111a12] p-1">
              <div className="grid h-full grid-cols-[2.1fr_1.4fr_1.4fr_0.9fr] gap-1">
                <div className="rounded bg-[#25be61]/80" style={{ opacity: Math.max(0.3, completionRate / 100) }} />
                <div className="rounded bg-[#2b9dd6]/80" style={{ opacity: Math.max(0.3, onTrack / Math.max(1, activeCount)) }} />
                <div className="rounded bg-[#8adf4e]/80" style={{ opacity: Math.max(0.3, atRisk / Math.max(1, activeCount)) }} />
                <div className="rounded bg-[#d69439]/85" style={{ opacity: Math.max(0.3, overdue / Math.max(1, activeCount)) }} />
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-[#a8b7a4]">
              <span>Excellent</span>
              <span>Good</span>
              <span>Improved</span>
              <span>Fair</span>
            </div>
          </Card>
        </div>

        <Card title={mode === "admin" ? "Employee Performance" : "My Task Updates"} className="h-[660px]">
          <ul className="mt-3 space-y-2">
            {(feedRows.length === 0
              ? [{ id: "empty", owner_name: "No activity yet", status: "not_started", updated_at: new Date().toISOString() }]
              : feedRows
            ).map((row, idx) => (
              <li
                key={row.id ?? idx}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#101610] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2c6233] text-[#d8ecd6]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">
                      {new Date(row.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[11px] text-[#98ad95]">
                      {row.owner_name || "Product Development"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold text-white">{performanceLabel(row.status)}</p>
                  {row.id !== "empty" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void requestUpdate(
                          row.id,
                          row.status === "completed" ? "in_progress" : "done"
                        )
                      }
                      disabled={updatingIds.includes(row.id)}
                      className="route5-pressable rounded-full border border-[#335338] bg-[#142515] px-2 py-1 text-[10px] text-[#c9dec9] hover:bg-[#1a2f1c]"
                    >
                      {updatingIds.includes(row.id) ? "Saving..." : row.status === "completed" ? "Re-open" : "Complete"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href="/workspace/agent"
              className="route5-pressable inline-flex rounded-full border border-[#2b6434] bg-[#12311a] px-3 py-1.5 text-xs font-semibold text-[#d9f7da]"
            >
              {mode === "admin" ? "Open Action Queue" : "Open My Queue"}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section
      className={`rounded-[26px] border border-[#2a3b2b] bg-[linear-gradient(180deg,#182417_0%,#121a12_100%)] p-4 shadow-[inset_0_1px_0_rgba(153,255,170,0.05),0_18px_42px_-24px_rgba(25,101,45,0.6)] ${className ?? ""}`}
    >
      <p className="text-[15px] font-semibold leading-none text-white">{title}</p>
      {children}
    </section>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <section className="rounded-[20px] border border-[#2a3b2b] bg-[linear-gradient(180deg,#1a2a18_0%,#132013_100%)] p-3 shadow-[inset_0_1px_0_rgba(153,255,170,0.04)]">
      <p className="text-[11px] text-[#9eb19d]">{title}</p>
      <p className="mt-1 text-[31px] leading-none text-white">{value}</p>
    </section>
  );
}
