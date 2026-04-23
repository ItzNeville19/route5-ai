"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowUpRight,
  Clock3,
  AlertTriangle,
  CalendarDays,
  Building2,
  Users,
  ListTodo,
  UserRound,
} from "lucide-react";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useI18n } from "@/components/i18n/I18nProvider";
import OverviewHomeHero, { dayPeriodForHour } from "@/components/overview/OverviewHomeHero";
import { formatRelativeLong } from "@/lib/relative-time";
import { getWorkspaceIanaTimeZone, getDisplayLocationLabel } from "@/lib/workspace-regions";
import { hourInTimezone } from "@/lib/timezone-date";
import { primaryModLabelFromNavigator } from "@/lib/platform-shortcuts";
import { isNavKeyVisible } from "@/lib/org-ui-policy";
import { canCreateCompany } from "@/lib/workspace-role";

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

function OverviewHeroCTAs() {
  const { t } = useI18n();
  const { orgUiPolicy, orgRole, loadingOrganization } = useWorkspaceData();
  const showAddCompany = !loadingOrganization && canCreateCompany(orgRole);
  const showTaskTracker = loadingOrganization || isNavKeyVisible("tasks", orgUiPolicy, orgRole);
  const isMember = !loadingOrganization && orgRole === "member";
  const primaryCtaClass =
    "inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 text-[12px] font-semibold text-white shadow-[0_8px_20px_-14px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:bg-white/20";
  const memberAccentClass =
    "inline-flex h-10 items-center gap-2 rounded-full bg-indigo-500 px-4 text-[12px] font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-400";
  if (isMember) {
    return (
      <>
        <Link href="/workspace/commitments" className={memberAccentClass}>
          <ListTodo className="h-4 w-4" aria-hidden />
          {t("overview.home.myTasksCta")}
        </Link>
        <Link href="/desk" className={primaryCtaClass}>
          {t("overview.home.openDesk")}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
      </>
    );
  }
  return (
    <>
      {showAddCompany ? (
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("route5:new-project-open", { detail: { mode: "company" } })
            )
          }
          className={primaryCtaClass}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("overview.home.addCompany")}
        </button>
      ) : null}
      {showTaskTracker ? (
        <Link href="/workspace/commitments" className={primaryCtaClass}>
          {t("overview.home.taskTracker")}
        </Link>
      ) : null}
    </>
  );
}

function roleLabelForHome(role: OrgRole | null, loading: boolean): string {
  if (loading || !role) return "Workspace Home";
  if (role === "member") return "Employee Home";
  if (role === "manager") return "Manager Home";
  return "Admin Home";
}

function roleLeadForHome(role: OrgRole | null, loading: boolean): string {
  if (loading || !role) return "Your role-aware command center.";
  if (role === "member") {
    return "Employee view: your own queue, due work, and company context.";
  }
  if (role === "manager") {
    return "Manager view: team load, routing, and follow-through.";
  }
  return "Admin view: full organization control, policy, and visibility.";
}

export default function OverviewPage() {
  const { user } = useUser();
  const { intlLocale, t } = useI18n();
  const exp = useWorkspaceExperience();
  const { projects, orgRole, loadingOrganization } = useWorkspaceData();
  const mod = primaryModLabelFromNavigator();
  const [now, setNow] = useState(() => new Date());
  const [loadingOwnTasks, setLoadingOwnTasks] = useState(true);
  const [loadingAdminTasks, setLoadingAdminTasks] = useState(false);
  const [loadingManagerMembers, setLoadingManagerMembers] = useState(false);
  const [ownTasks, setOwnTasks] = useState<OrgCommitmentRow[]>([]);
  const [adminOrgTasks, setAdminOrgTasks] = useState<OrgCommitmentRow[]>([]);
  const [managerMembers, setManagerMembers] = useState<OrgPayload["members"]>([]);

  const homeIana = useMemo(
    () => getWorkspaceIanaTimeZone(exp.prefs.workspaceTimezone, exp.prefs.workspaceRegionKey),
    [exp.prefs.workspaceRegionKey, exp.prefs.workspaceTimezone]
  );
  const placeLabel = useMemo(
    () => getDisplayLocationLabel(homeIana, exp.prefs.workspaceRegionKey),
    [homeIana, exp.prefs.workspaceRegionKey]
  );
  const period = useMemo(() => dayPeriodForHour(hourInTimezone(homeIana, now)), [homeIana, now]);

  const [heroWallIdx, setHeroWallIdx] = useState(0);
  useEffect(() => {
    try {
      const s = sessionStorage.getItem("route5:overview-hero-wall");
      if (s) setHeroWallIdx(parseInt(s, 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const cycleHeroWall = useCallback(() => {
    setHeroWallIdx((n) => {
      const next = n + 1;
      try {
        sessionStorage.setItem("route5:overview-hero-wall", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const overviewCanvasMode =
    (exp.prefs.workspaceCanvasBackground ?? "gradient") === "photo" ? "photo" : "gradient";

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOwnTasks(true);
      try {
        const owner = user?.id
          ? `?owner=${encodeURIComponent(user.id)}&sort=deadline&order=asc`
          : "?sort=deadline&order=asc";
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

  const companiesEmptyCopy = useMemo(() => {
    if (loadingOrganization) {
      return "…";
    }
    return canCreateCompany(orgRole)
      ? t("overview.home.emptyCompanies.leadership")
      : t("overview.home.emptyCompanies.member");
  }, [orgRole, loadingOrganization, t]);

  const roleHomeLabel = useMemo(
    () => roleLabelForHome(orgRole, loadingOrganization),
    [orgRole, loadingOrganization]
  );
  const roleHomeLead = useMemo(
    () => roleLeadForHome(orgRole, loadingOrganization),
    [orgRole, loadingOrganization]
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-[min(100%,1200px)] space-y-6 pb-12"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
    >
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
        <OverviewHomeHero
          period={period}
          now={now}
          firstName={firstName}
          timeZone={homeIana}
          placeLabel={placeLabel}
          locale={intlLocale}
          canvasMode={overviewCanvasMode}
          heroWallIndex={heroWallIdx}
          workspaceRegionKey={exp.prefs.workspaceRegionKey}
          onCycleHeroWall={cycleHeroWall}
        >
          <OverviewHeroCTAs />
        </OverviewHomeHero>
      </motion.div>

      <motion.section variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_10px_28px_-18px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
                {roleHomeLabel}
              </p>
              <h2 className="text-[16px] font-semibold text-r5-text-primary">Action center</h2>
              <p className="max-w-2xl text-[12px] text-r5-text-secondary">{roleHomeLead}</p>
            </div>
            <p className="text-[12px] text-r5-text-secondary">
              Press{" "}
              <kbd className="rounded border border-r5-border-subtle bg-r5-surface-secondary px-1.5 py-0.5 font-mono text-[11px]">
                {mod}K
              </kbd>{" "}
              to jump anywhere
            </p>
          </div>
          <div className="border-t border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-r5-text-secondary">
              Audience map
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  orgRole === "member"
                    ? "border-indigo-300 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                Employee: execute assigned work
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  orgRole === "manager"
                    ? "border-indigo-300 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                Manager: route and balance team load
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  orgRole === "admin"
                    ? "border-indigo-300 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                Admin: full org control and policy
              </span>
            </div>
            <p className="mt-2 text-[12px] text-r5-text-secondary">
              Navigation stays in the sidebar. Home is now a role status page, not a second menu.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.15)] dark:border-slate-700 dark:bg-slate-950/55"
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <div className="border-b border-slate-200/90 bg-slate-50/95 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="text-[14px] font-semibold text-r5-text-primary">Execution pulse</h2>
          <p className="mt-0.5 text-[12px] text-r5-text-secondary">Scan urgency first, then move into action.</p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <MetricCard
            icon={AlertTriangle}
            label="Overdue"
            value={overdueCount}
            tone="text-r5-status-overdue"
            hint="Needs attention now"
          />
          <MetricCard
            icon={Clock3}
            label="Due soon"
            value={dueSoonCount}
            tone="text-r5-status-at-risk"
            hint="Next 3 days"
          />
          <MetricCard
            icon={CalendarDays}
            label="Open"
            value={ownOpenTasks.length}
            tone="text-r5-status-completed"
            hint="Still in your queue"
          />
        </div>
      </motion.section>

      <motion.div
        className="grid gap-5 lg:grid-cols-2"
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/55">
          <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
            <h2 className="text-[15px] font-semibold text-r5-text-primary">Task queue (employee view)</h2>
            <Link href="/workspace/commitments" className="text-[12px] font-medium text-[#5059c9] hover:underline">
              Open tracker
            </Link>
          </div>
          <div className="p-0">
            {loadingOwnTasks ? (
              <p className="px-4 py-6 text-[13px] text-r5-text-secondary">Loading tasks…</p>
            ) : ownOpenTasks.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-r5-text-secondary">No open work assigned to you.</p>
            ) : (
              <ul>
                {ownOpenTasks.slice(0, 8).map((task) => (
                  <li
                    key={task.id}
                    className="border-b border-r5-border-subtle/60 last:border-0"
                  >
                    <Link
                      href={`/workspace/commitments?id=${encodeURIComponent(task.id)}`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-r5-surface-secondary/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-r5-text-primary">{task.title}</p>
                        <p className="mt-0.5 text-[11px] text-r5-text-secondary">Due {new Date(task.deadline).toLocaleString(intlLocale, { dateStyle: "medium" })}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-r5-text-tertiary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/55">
          <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-r5-text-primary">
              <Building2 className="h-4 w-4 text-r5-text-secondary" aria-hidden />
              Companies in your scope
            </h2>
            <Link href="/companies" className="text-[12px] font-medium text-[#5059c9] hover:underline">
              See all
            </Link>
          </div>
          <div className="p-0">
            {myCompanies.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-r5-text-secondary">{companiesEmptyCopy}</p>
            ) : (
              <ul>
                {myCompanies.map((company) => (
                  <li key={company.id} className="border-b border-r5-border-subtle/60 last:border-0">
                    <Link
                      href={`/companies/${company.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-r5-surface-secondary/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-r5-text-primary">{company.name}</p>
                        <p className="mt-0.5 text-[11px] text-r5-text-secondary">Updated {formatRelativeLong(company.updatedAt)}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-r5-text-tertiary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </motion.div>

      {loadingOrganization ? null : orgRole === "admin" ? (
        <motion.section
          className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/55"
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
        >
          <div className="border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
            <h2 className="text-[15px] font-semibold text-r5-text-primary">Admin control queue</h2>
            <p className="mt-0.5 text-[12px] text-r5-text-secondary">Organization-wide open work for assignment and escalation.</p>
          </div>
          {loadingAdminTasks ? (
            <p className="px-4 py-6 text-[13px] text-r5-text-secondary">Loading team tasks…</p>
          ) : adminBottomRows.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-r5-text-secondary">No open team tasks.</p>
          ) : (
            <ul>
              {adminBottomRows.map((task) => (
                <li key={task.id} className="border-b border-r5-border-subtle/60 last:border-0">
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-r5-text-primary">{task.title}</p>
                      <p className="text-[11px] text-r5-text-secondary">{ownerLabel(task.ownerId)}</p>
                    </div>
                    <span className="text-[12px] text-r5-text-secondary">
                      {new Date(task.deadline).toLocaleString(intlLocale, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      ) : orgRole === "manager" ? (
        <motion.section
          className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/55"
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-r5-text-primary">
              <Users className="h-4 w-4 text-r5-text-secondary" aria-hidden />
              Manager team load
            </h2>
            <Link href="/workspace/team-work" className="text-[12px] font-medium text-[#5059c9] hover:underline">
              Open full view
            </Link>
          </div>
          {loadingManagerMembers ? (
            <p className="px-4 py-6 text-[13px] text-r5-text-secondary">Loading team list…</p>
          ) : managerBottomRows.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-r5-text-secondary">No upcoming team work right now.</p>
          ) : (
            <ul>
              {managerBottomRows.map((member) => (
                <li key={member.userId} className="border-b border-r5-border-subtle/60 last:border-0">
                  <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                    <p className="truncate text-[14px] text-r5-text-primary">{member.displayName}</p>
                    <span className="shrink-0 text-[12px] font-medium text-r5-text-secondary">
                      {member.activeCommitmentsCount} open
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      ) : null}

      <motion.section
        className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/60"
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-r5-text-secondary" aria-hidden />
          <h2 className="text-[14px] font-semibold text-r5-text-primary">Role clarity</h2>
        </div>
        <p className="mt-1 text-[12px] text-r5-text-secondary">
          Employees work from <span className="font-medium text-r5-text-primary">Task queue + Desk</span>. Managers run{" "}
          <span className="font-medium text-r5-text-primary">team load + routing</span>. Admins own{" "}
          <span className="font-medium text-r5-text-primary">organization policy + full visibility</span>.
        </p>
      </motion.section>
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: string;
  hint: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-r5-border-subtle/80 bg-r5-surface-primary p-3 sm:flex-col sm:gap-1">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6264A7]/10 text-[#5059c9] sm:mb-1">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-r5-text-secondary">{label}</p>
        <p className={`text-[28px] font-bold leading-tight tabular-nums sm:text-[32px] ${tone}`}>{value}</p>
        <p className="text-[11px] text-r5-text-tertiary">{hint}</p>
      </div>
    </div>
  );
}
