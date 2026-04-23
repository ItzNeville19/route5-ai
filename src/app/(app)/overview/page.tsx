"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, ArrowUpRight, Clock3, AlertTriangle, CalendarDays, Building2, Users } from "lucide-react";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import OverviewHomeHero, { dayPeriodForHour } from "@/components/overview/OverviewHomeHero";
import { formatRelativeLong } from "@/lib/relative-time";

type OrgRole = "admin" | "manager" | "member";

type OrgPayload = {
  me: { userId: string; role: OrgRole };
  members: Array<{
    userId: string;
    displayName: string;
    role: OrgRole;
    activeCommitmentsCount: number;
  }>;
};

function isOpenTask(row: OrgCommitmentRow): boolean {
  return row.status !== "completed";
}

function taskDueSoon(row: OrgCommitmentRow): boolean {
  if (!isOpenTask(row)) return false;
  const ms = new Date(row.deadline).getTime() - Date.now();
  return ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
}

function ownerLabel(ownerId: string): string {
  if (!ownerId) return "Unassigned";
  return ownerId.length > 16 ? `${ownerId.slice(0, 14)}…` : ownerId;
}

export default function OverviewPage() {
  const { user } = useUser();
  const { projects, orgRole, loadingOrganization } = useWorkspaceData();
  const [now, setNow] = useState(() => new Date());
  const [loadingOwnTasks, setLoadingOwnTasks] = useState(true);
  const [loadingAdminTasks, setLoadingAdminTasks] = useState(false);
  const [loadingManagerMembers, setLoadingManagerMembers] = useState(false);
  const [ownTasks, setOwnTasks] = useState<OrgCommitmentRow[]>([]);
  const [adminOrgTasks, setAdminOrgTasks] = useState<OrgCommitmentRow[]>([]);
  const [managerMembers, setManagerMembers] = useState<OrgPayload["members"]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOwnTasks(true);
      try {
        const owner = user?.id ? `?owner=${encodeURIComponent(user.id)}&sort=deadline&order=asc` : "?sort=deadline&order=asc";
        const res = await fetch(`/api/commitments${owner}`, { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as { commitments?: OrgCommitmentRow[] };
        if (!cancelled && res.ok) setOwnTasks(data.commitments ?? []);
      } finally {
        if (!cancelled) setLoadingOwnTasks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (orgRole !== "admin") {
      setAdminOrgTasks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingAdminTasks(true);
      try {
        const res = await fetch("/api/commitments?sort=deadline&order=asc", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as { commitments?: OrgCommitmentRow[] };
        if (!cancelled && res.ok) setAdminOrgTasks(data.commitments ?? []);
      } finally {
        if (!cancelled) setLoadingAdminTasks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgRole]);

  useEffect(() => {
    if (orgRole !== "manager") {
      setManagerMembers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingManagerMembers(true);
      try {
        const res = await fetch("/api/workspace/organization", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as OrgPayload;
        if (!cancelled && res.ok) {
          setManagerMembers(data.members ?? []);
        }
      } finally {
        if (!cancelled) setLoadingManagerMembers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgRole]);

  const period = dayPeriodForHour(now.getHours());

  const firstName = useMemo(() => {
    const fn = user?.firstName?.trim();
    if (fn) return fn;
    const full = user?.fullName?.trim();
    if (full) return full.split(/\s+/)[0] ?? "";
    return user?.username?.trim() ?? "";
  }, [user?.firstName, user?.fullName, user?.username]);

  const ownOpenTasks = useMemo(() => ownTasks.filter(isOpenTask), [ownTasks]);
  const overdueCount = useMemo(
    () => ownOpenTasks.filter((row) => row.status === "overdue").length,
    [ownOpenTasks]
  );
  const dueSoonCount = useMemo(
    () => ownOpenTasks.filter(taskDueSoon).length,
    [ownOpenTasks]
  );
  const myCompanies = useMemo(() => projects.slice(0, 8), [projects]);
  const adminBottomRows = useMemo(
    () => adminOrgTasks.filter(isOpenTask).slice(0, 10),
    [adminOrgTasks]
  );
  const managerBottomRows = useMemo(
    () =>
      managerMembers
        .filter((member) => member.role !== "admin")
        .sort((a, b) => b.activeCommitmentsCount - a.activeCommitmentsCount)
        .slice(0, 10),
    [managerMembers]
  );

  return (
    <div className="mx-auto w-full max-w-[var(--r5-feed-max-width)] space-y-[var(--r5-space-5)]">
      <OverviewHomeHero period={period} now={now} firstName={firstName}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/80 px-3 text-[12px] font-medium text-r5-text-primary shadow-sm backdrop-blur-sm transition hover:bg-r5-surface-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add company
        </button>
        <Link
          href="/workspace/commitments"
          className="inline-flex h-9 items-center gap-2 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/80 px-3 text-[12px] font-medium text-r5-text-primary shadow-sm backdrop-blur-sm transition hover:bg-r5-surface-hover"
        >
          Task tracker
        </Link>
      </OverviewHomeHero>

      <section className="grid gap-[var(--r5-space-3)] sm:grid-cols-3">
        <MetricCard icon={AlertTriangle} label="Overdue tasks" value={overdueCount} tone="text-r5-status-overdue" />
        <MetricCard icon={Clock3} label="Due soon" value={dueSoonCount} tone="text-r5-status-at-risk" />
        <MetricCard icon={CalendarDays} label="Open tasks" value={ownOpenTasks.length} tone="text-r5-status-completed" />
      </section>

      <section className="grid gap-[var(--r5-space-4)] lg:grid-cols-2">
        <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">My tasks</h2>
          {loadingOwnTasks ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">Loading tasks…</p>
          ) : ownOpenTasks.length === 0 ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">You are clear. No open tasks.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ownOpenTasks.slice(0, 8).map((task) => (
                <li key={task.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] text-r5-text-primary">{task.title}</p>
                    <span className="text-[11px] text-r5-text-secondary">{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <h2 className="flex items-center gap-2 text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
            <Building2 className="h-4 w-4" aria-hidden />
            My companies
          </h2>
          {myCompanies.length === 0 ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">No companies yet. Use “Add company” to start.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myCompanies.map((company) => (
                <li key={company.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2">
                  <Link href={`/companies/${company.id}`} className="flex items-start justify-between gap-2 text-[13px] text-r5-text-primary">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{company.name}</span>
                      <span className="mt-0.5 block text-[11px] text-r5-text-secondary">
                        Updated {formatRelativeLong(company.updatedAt)}
                      </span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-r5-text-secondary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {loadingOrganization ? null : orgRole === "admin" ? (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">All team tasks</h2>
          {loadingAdminTasks ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">Loading team tasks…</p>
          ) : adminBottomRows.length === 0 ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">No open team tasks.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {adminBottomRows.map((task) => (
                <li key={task.id} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-r5-text-primary">{task.title}</p>
                      <p className="text-[11px] text-r5-text-secondary">{ownerLabel(task.ownerId)}</p>
                    </div>
                    <span className="text-[11px] text-r5-text-secondary">{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : orgRole === "manager" ? (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
              <Users className="h-4 w-4" aria-hidden />
              Team with upcoming work
            </h2>
            <Link href="/workspace/team-work" className="text-[12px] font-medium text-r5-accent hover:underline">
              Open full screen
            </Link>
          </div>
          {loadingManagerMembers ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">Loading team list…</p>
          ) : managerBottomRows.length === 0 ? (
            <p className="mt-3 text-[13px] text-r5-text-secondary">No upcoming team work right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {managerBottomRows.map((member) => (
                <li key={member.userId} className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] text-r5-text-primary">{member.displayName}</p>
                    <span className="text-[11px] text-r5-text-secondary">{member.activeCommitmentsCount} upcoming</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-secondary/40 p-[var(--r5-space-4)]">
      <p className="flex items-center gap-1.5 text-[length:var(--r5-font-caption)] uppercase tracking-[0.12em] text-r5-text-secondary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className={`mt-2 text-[length:var(--r5-font-stat)] font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
