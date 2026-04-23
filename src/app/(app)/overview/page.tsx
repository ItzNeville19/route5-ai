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
  LayoutGrid,
  ListTodo,
  Sparkles,
  ScrollText,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useI18n } from "@/components/i18n/I18nProvider";
import OverviewHomeHero, { dayPeriodForHour } from "@/components/overview/OverviewHomeHero";
import { formatRelativeLong } from "@/lib/relative-time";
import { getWorkspaceIanaTimeZone, getDisplayLocationLabel } from "@/lib/workspace-regions";
import { hourInTimezone } from "@/lib/timezone-date";
import { primaryModLabelFromNavigator } from "@/lib/platform-shortcuts";
import { isNavKeyVisible, type OrgNavKey } from "@/lib/org-ui-policy";
import { canCreateCompany, orgRoleLabel } from "@/lib/workspace-role";

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
    "inline-flex h-9 items-center gap-2 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/90 px-3 text-[12px] font-medium text-r5-text-primary shadow-sm transition hover:bg-r5-surface-hover";
  const memberAccentClass =
    "inline-flex h-9 items-center gap-2 rounded-[var(--r5-radius-pill)] bg-[#5059c9] px-3.5 text-[12px] font-semibold text-white shadow-md shadow-[#5059c9]/25 transition hover:opacity-[0.97] dark:bg-[#6264A7] dark:shadow-[#6264A7]/20";
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

function OverviewRoleContextStrip() {
  const { t } = useI18n();
  const { orgRole, loadingOrganization } = useWorkspaceData();
  if (loadingOrganization || !orgRole) return null;
  const k =
    orgRole === "member"
      ? "overview.home.roleContext.member"
      : orgRole === "manager"
        ? "overview.home.roleContext.manager"
        : "overview.home.roleContext.admin";
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-950/65"
    >
      <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 sm:text-[13px]">
        <span className="font-semibold text-slate-900 dark:text-white">{orgRoleLabel(orgRole)}</span>
        <span className="text-slate-400 dark:text-slate-500"> — </span>
        {t(k)}
      </p>
    </motion.div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  orgNavKey,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  orgNavKey?: OrgNavKey | null;
}) {
  const { orgUiPolicy, orgRole, loadingOrganization } = useWorkspaceData();
  if (!loadingOrganization && orgNavKey && !isNavKeyVisible(orgNavKey, orgUiPolicy, orgRole)) {
    return null;
  }
  return (
    <Link
      href={href}
      className="group flex min-h-[6.5rem] flex-col gap-1.5 rounded-2xl border border-slate-200/95 bg-white p-3 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] transition hover:border-[#6264A7]/40 hover:shadow-[0_10px_28px_-12px_rgba(79,70,229,0.22)] dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-[#818cf8]/35"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6264A7]/12 text-[#5059c9] dark:bg-[#6264A7]/22 dark:text-[#a6a7dc]">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-[14px] font-semibold leading-tight text-r5-text-primary">{label}</span>
      <span className="line-clamp-2 text-[11px] leading-snug text-r5-text-secondary">{hint}</span>
    </Link>
  );
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

  const jumpBackHintKey = useMemo(() => {
    if (loadingOrganization) return "overview.home.jumpBack.hintDefault" as const;
    if (orgRole === "member") return "overview.home.jumpBack.hintMember" as const;
    if (orgRole === "manager") return "overview.home.jumpBack.hintManager" as const;
    if (orgRole === "admin") return "overview.home.jumpBack.hintAdmin" as const;
    return "overview.home.jumpBack.hintDefault" as const;
  }, [orgRole, loadingOrganization]);

  const companiesEmptyCopy = useMemo(() => {
    if (loadingOrganization) {
      return "…";
    }
    return canCreateCompany(orgRole)
      ? t("overview.home.emptyCompanies.leadership")
      : t("overview.home.emptyCompanies.member");
  }, [orgRole, loadingOrganization, t]);

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

      <motion.p
        className="px-0.5 text-[12px] text-r5-text-secondary sm:text-[13px]"
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <span className="font-medium text-r5-text-primary/90">Tip</span> — Press{" "}
        <kbd className="rounded border border-r5-border-subtle bg-r5-surface-secondary px-1.5 py-0.5 font-mono text-[11px]">
          {mod}K
        </kbd>{" "}
        to search routes, companies, and actions.
      </motion.p>

      <motion.section variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 px-0.5">
          <h2 className="text-[15px] font-semibold text-r5-text-primary">Jump back in</h2>
          <span className="max-w-xl text-[12px] leading-snug text-r5-text-secondary sm:text-right">
            {t(jumpBackHintKey)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <QuickAction
            href="/desk"
            icon={LayoutGrid}
            label="Desk"
            hint="Execution & capture"
            orgNavKey="desk"
          />
          <QuickAction
            href="/workspace/commitments"
            icon={ListTodo}
            label="Tasks"
            hint="Tracker & owners"
            orgNavKey="tasks"
          />
          <QuickAction
            href="/capture"
            icon={Sparkles}
            label="Capture"
            hint="Notes to structured work"
            orgNavKey={null}
          />
          <QuickAction
            href="/companies"
            icon={Building2}
            label="Companies"
            hint="Programs you follow"
            orgNavKey="companies"
          />
          <QuickAction
            href="/workspace/digest"
            icon={ScrollText}
            label="Digest"
            hint="Rollups & summaries"
            orgNavKey={null}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-r5-border-subtle px-3 py-2 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-text-tertiary hover:text-r5-text-primary"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            Time zone &amp; location
          </Link>
        </div>
      </motion.section>

      <motion.section
        className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.15)] dark:border-slate-700 dark:bg-slate-950/55"
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <div className="border-b border-slate-200/90 bg-slate-50/95 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="text-[14px] font-semibold text-r5-text-primary">This week on your plate</h2>
          <p className="mt-0.5 text-[12px] text-r5-text-secondary">Prioritize what is overdue, due soon, and still open.</p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <MetricCard
            icon={AlertTriangle}
            label="Overdue"
            value={overdueCount}
            tone="text-r5-status-overdue"
            hint="Needs a date or owner"
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
            hint="Assigned to you"
          />
        </div>
      </motion.section>

      <motion.div
        className="grid gap-5 lg:grid-cols-2"
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/55">
          <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
            <h2 className="text-[15px] font-semibold text-r5-text-primary">My tasks</h2>
            <Link href="/workspace/commitments" className="text-[12px] font-medium text-[#5059c9] hover:underline">
              Open tracker
            </Link>
          </div>
          <div className="p-0">
            {loadingOwnTasks ? (
              <p className="px-4 py-6 text-[13px] text-r5-text-secondary">Loading tasks…</p>
            ) : ownOpenTasks.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-r5-text-secondary">You are clear — nothing open. Nice.</p>
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
              My companies
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
            <h2 className="text-[15px] font-semibold text-r5-text-primary">All team tasks</h2>
            <p className="mt-0.5 text-[12px] text-r5-text-secondary">Org-wide open work — for routing and follow-up.</p>
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
              Team load
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
