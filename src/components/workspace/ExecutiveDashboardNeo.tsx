"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Bell,
  Bot,
  Building2,
  Home,
  Palette,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
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

const payrollData = [
  { x: "1", y: 7600 },
  { x: "2", y: 3900 },
  { x: "3", y: 9100 },
  { x: "4", y: 5400 },
  { x: "5", y: 6200 },
  { x: "6", y: 12600 },
  { x: "7", y: 5200 },
  { x: "8", y: 13400 },
  { x: "9", y: 8600 },
  { x: "10", y: 15200 },
];

function performanceLabel(status: string) {
  if (status === "completed") return "Excellent";
  if (status === "in_progress") return "Good";
  if (status === "not_started") return "Average";
  return "Bad";
}

export default function ExecutiveDashboardNeo() {
  const { orgRole } = useWorkspaceData();
  const { user } = useUser();
  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [mode, setMode] = useState<ViewMode>(orgRole === "admin" ? "admin" : "employee");
  const [loading, setLoading] = useState(true);
  const canPreview = orgRole === "admin";
  const scope: Scope = mode === "employee" ? "self" : "org";

  useEffect(() => {
    if (orgRole === "admin") setMode("admin");
    else setMode("employee");
  }, [orgRole]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `?scope=${scope}`;
      const [mRes, aRes] = await Promise.all([
        fetch(`/api/dashboard/metrics${qs}`, { credentials: "same-origin" }),
        fetch(`/api/dashboard/activity${qs}`, { credentials: "same-origin" }),
      ]);
      const mJson = (await mRes.json().catch(() => ({}))) as { metrics?: LiveDashboardMetrics };
      const aJson = (await aRes.json().catch(() => ({}))) as { activity?: ActivityRow[] };
      if (mRes.ok && mJson.metrics) setMetrics(mJson.metrics);
      if (aRes.ok && aJson.activity) setActivity(aJson.activity);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalCommitments = (metrics?.teamBreakdown ?? []).reduce((a, b) => a + b.total, 0) || 230;
  const completionRate = metrics
    ? Math.round(
        ((metrics.teamBreakdown.reduce((a, b) => a + b.completedOnTime, 0) || 0) /
          Math.max(1, totalCommitments)) *
          100
      )
    : 90;
  const activeCount = metrics?.activeCount ?? 234;

  const feedRows = useMemo(() => {
    const fallback = [
      { id: "1", owner_name: "Product Development", status: "completed" },
      { id: "2", owner_name: "Product Development", status: "in_progress" },
      { id: "3", owner_name: "Product Development", status: "blocked" },
      { id: "4", owner_name: "Product Development", status: "not_started" },
      { id: "5", owner_name: "Product Development", status: "completed" },
      { id: "6", owner_name: "Product Development", status: "in_progress" },
    ];
    if (activity.length === 0) return fallback;
    return activity.slice(0, 6);
  }, [activity]);

  if (loading && !metrics) {
    return <div className="p-6 text-sm text-white/70">Loading your execution dashboard...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] rounded-[34px] border border-[#233123] bg-[linear-gradient(180deg,#0b0f0b_0%,#11170f_100%)] p-4 shadow-[0_40px_120px_-64px_rgba(22,163,74,0.5)]">
      <div className="mb-3 flex items-center justify-between rounded-[18px] border border-[#223423] bg-[#0a0f0b]/75 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#345734] bg-[#0f1c12] text-xl text-white">
            ∞
          </div>
          <TopIcon href="/workspace/dashboard" icon={Home} />
          <TopIcon href="/workspace/agent" icon={Bot} />
          <TopIcon href="/workspace/customize" icon={Palette} />
          <TopIcon href="/workspace/organization" icon={Building2} />
          <TopIcon href="/workspace/team" icon={Users} />
          <TopIcon href="/settings" icon={Settings} />
          <TopIcon href="/workspace/notifications" icon={Bell} />
        </div>
        <div className="flex items-center gap-3">
          {canPreview ? (
            <div className="inline-flex rounded-full border border-[#2d4b2d] bg-[#0b140d] p-1 text-[11px]">
              <button
                type="button"
                onClick={() => setMode("admin")}
                className={`rounded-full px-3 py-1 ${mode === "admin" ? "bg-[#1f6f2c] text-white" : "text-[#b7c6b2]"}`}
              >
                Admin view
              </button>
              <button
                type="button"
                onClick={() => setMode("employee")}
                className={`rounded-full px-3 py-1 ${mode === "employee" ? "bg-[#1f6f2c] text-white" : "text-[#b7c6b2]"}`}
              >
                Employee preview
              </button>
            </div>
          ) : null}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#324532] bg-[#121b13] text-[#d7e3d3]">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#324532] bg-[#121b13] text-[#d7e3d3]">
            <UserCircle2 className="h-4 w-4" />
          </div>
          <div className="h-8 w-8 overflow-hidden rounded-full border border-[#4b5e4b] bg-[#132015]">
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.04fr_1.48fr_0.82fr]">
        <div className="grid gap-3">
          <Card title="Employee Attendance" className="h-[358px]">
            <div className="relative h-[285px] pt-3">
              <div className="absolute right-2 top-0 rounded-xl bg-black px-3 py-1 text-sm font-semibold text-white">
                {completionRate}.24%
              </div>
              <div className="flex h-full items-end gap-3">
                {[67, 43, 31, 90, 38, 72, 46].map((height, idx) => (
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
                <div className="mx-auto mt-2 h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-[#1d2f1f]" />
                <p className="mt-1 text-xl">🏅</p>
                <p className="mt-2 text-[11px] text-[#9db09a]">Name</p>
                <p className="text-[20px] font-semibold text-white">Leslie Alexander</p>
              </div>
              <div className="space-y-3 rounded-[20px] border border-white/10 bg-[#101a11] p-3 text-[13px] text-[#c8d8c5]">
                <p className="text-[#9db09a]">Home pay</p>
                <p className="text-lg font-semibold text-white">$209,350</p>
                <p className="text-[#9db09a]">Payment Done</p>
                <p className="text-lg font-semibold text-white">70%</p>
                <p className="text-[#9db09a]">Left</p>
                <p className="text-lg font-semibold text-white">$16,909</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-4 gap-3">
            <KpiCard title="Total Employee" value={totalCommitments} />
            <KpiCard title="Turnover Rate" value={`${Math.max(10.2, completionRate / 10).toFixed(1)}%`} />
            <KpiCard title="Job Applicant" value={activeCount} />
            <KpiCard title="Monthly Salary" value="$4,45,500" />
          </div>
          <div className="grid grid-cols-[1.65fr_0.68fr] gap-3">
            <Card title="Employee States" className="h-[132px]">
              <div className="mt-3 h-10 rounded-[8px] bg-[#111a12] p-1">
                <div className="grid h-full grid-cols-[2.7fr_1.6fr_1fr] gap-1">
                  <div className="rounded bg-[#1f7f3f]/80" />
                  <div className="rounded bg-[#2e84d6]/75" />
                  <div className="rounded bg-[#d6842e]/80" />
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#a8b7a4]">
                <span>Permanent</span>
                <span>Contract</span>
                <span>Probation</span>
              </div>
            </Card>
            <Card title="Average Employee performance this months" className="h-[132px]">
              <p className="mt-3 text-4xl font-semibold text-white">8.98</p>
              <p className="mt-1 text-sm text-[#9cb89c]">2.8%</p>
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
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Employee Performance Chart" className="h-[132px]">
            <div className="mt-3 h-7 rounded-[8px] bg-[#111a12] p-1">
              <div className="grid h-full grid-cols-[2.1fr_1.4fr_1.4fr_0.9fr] gap-1">
                <div className="rounded bg-[#25be61]/80" />
                <div className="rounded bg-[#2b9dd6]/80" />
                <div className="rounded bg-[#8adf4e]/80" />
                <div className="rounded bg-[#d69439]/85" />
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

        <Card title="Employee Performance" className="h-[660px]">
          <ul className="mt-3 space-y-2">
            {feedRows.map((row, idx) => (
              <li
                key={row.id ?? idx}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#101610] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#2c6233]" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">Sep 10, 2025</p>
                    <p className="text-[11px] text-[#98ad95]">
                      {row.owner_name || "Product Development"}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] font-semibold text-white">{performanceLabel(row.status)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href="/workspace/agent"
              className="inline-flex rounded-full border border-[#2b6434] bg-[#12311a] px-3 py-1.5 text-xs font-semibold text-[#d9f7da]"
            >
              Open Agent
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TopIcon({
  href,
  icon: Icon,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2f4531] bg-[#121b13] text-[#d6e3d2] hover:bg-[#1b2a1d]"
    >
      <Icon className="h-4 w-4" />
    </Link>
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
