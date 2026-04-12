"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Library,
  MessageCircle,
  PanelTop,
  Pin,
  PinOff,
  Plug2,
  Plus,
  Rocket,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import WorkspaceInstallControls from "@/components/workspace/WorkspaceInstallControls";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { MERIDIAN_SHORT } from "@/lib/assistant-brand";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { PRODUCT_MISSION } from "@/lib/product-truth";
import type { Project } from "@/lib/types";

const tierLabel =
  process.env.NEXT_PUBLIC_WORKSPACE_TIER_PRIMARY?.trim() || "Pro";

type Exp = ReturnType<typeof useWorkspaceExperience>;

function SidebarProjectRow({
  p,
  active,
  exp,
}: {
  p: Project;
  active: boolean;
  exp: Exp;
}) {
  const pinned = exp.isProjectPinned(p.id);
  return (
    <li>
      <div
        className={`flex items-center gap-0.5 rounded-lg ${
          active ? "bg-[var(--workspace-nav-active)]" : "hover:bg-[var(--workspace-nav-hover)]"
        }`}
      >
        <button
          type="button"
          onClick={() => exp.togglePinProject(p.id)}
          className="shrink-0 rounded-md p-1.5 text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-accent)]"
          title={pinned ? "Unpin" : "Pin to top"}
          aria-label={pinned ? "Unpin project" : "Pin project"}
        >
          {pinned ? (
            <Pin className="h-3.5 w-3.5 text-[var(--workspace-accent)]" strokeWidth={2} />
          ) : (
            <PinOff className="h-3.5 w-3.5 opacity-50" strokeWidth={2} />
          )}
        </button>
        <Link
          href={`/projects/${p.id}`}
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-[13px] ${
            active ? "font-medium text-[var(--workspace-fg)]" : "text-[var(--workspace-muted-fg)]"
          }`}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center text-[13px] leading-none"
              aria-hidden
            >
              {p.iconEmoji?.trim() ? (
                <span title="Project icon">{p.iconEmoji.trim()}</span>
              ) : (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-[var(--workspace-accent)]" : "bg-[var(--workspace-muted-fg)] opacity-40"
                  }`}
                />
              )}
            </span>
            <span className="truncate">{p.name}</span>
          </span>
        </Link>
      </div>
    </li>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  href?: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  const className = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
    active
      ? "bg-[var(--workspace-nav-active)] text-[var(--workspace-fg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
      : "text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
  }`;

  const inner = (
    <>
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition ${active ? "text-[var(--workspace-accent)]" : "opacity-85 group-hover:opacity-100"}`}
        strokeWidth={1.75}
        aria-hidden
      />
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" title={label} onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href!} title={label} className={className}>
      {inner}
    </Link>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const exp = useWorkspaceExperience();
  const { projects, summary, loadingProjects, entitlements } = useWorkspaceData();
  const { t } = useI18n();

  const { pinnedProjects, otherProjects } = useMemo(() => {
    const pins = new Set(exp.prefs.pinnedProjectIds ?? []);
    const pinned: Project[] = [];
    const other: Project[] = [];
    for (const p of projects) {
      if (pins.has(p.id)) pinned.push(p);
      else other.push(p);
    }
    pinned.sort((a, b) => a.name.localeCompare(b.name));
    other.sort((a, b) => a.name.localeCompare(b.name));
    return { pinnedProjects: pinned, otherProjects: other };
  }, [projects, exp.prefs.pinnedProjectIds]);

  const allSorted = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const activeProjectId =
    pathname?.startsWith("/projects/") && pathname !== "/projects"
      ? pathname.split("/")[2]
      : null;

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  const onboardingDone = user?.id ? isOnboardingComplete(user.id) : false;
  const path = pathname ?? "";
  const mobileOpen = exp.prefs.sidebarHidden !== true;

  return (
    <motion.aside
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`agent-sidebar fixed inset-y-0 left-0 z-40 flex w-[272px] shrink-0 flex-col overflow-hidden border-r border-[var(--workspace-border)] bg-[var(--workspace-sidebar)]/90 backdrop-blur-2xl transition-transform duration-300 md:static md:z-20 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand — minimal */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <Link
          href="/projects"
          className="workspace-brand-wordmark block truncate text-[var(--workspace-fg)] transition hover:opacity-90"
        >
          {PRODUCT_MISSION.name}
        </Link>
      </div>

      {/* Account — compact strip */}
      <div className="shrink-0 px-3 pb-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--workspace-border)]/90 bg-[var(--workspace-surface)]/55 p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/settings"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-1 ring-[var(--workspace-border)]",
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-[var(--workspace-fg)]">
              {displayName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={`text-[10px] font-medium ${
                  entitlements?.isPaidTier
                    ? "bg-gradient-to-r from-violet-300 to-[#d9f99d] bg-clip-text text-transparent"
                    : "text-[var(--workspace-muted-fg)]"
                }`}
              >
                {entitlements?.tierLabel ?? tierLabel}
              </span>
              <span className="text-[var(--workspace-border)]" aria-hidden>
                ·
              </span>
              <Link
                href="/account/plans"
                className="text-[10px] font-semibold text-[var(--workspace-accent)] hover:underline"
              >
                {t("sidebar.plans")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <nav className="shrink-0 space-y-0.5 px-3" aria-label="Primary">
        {!onboardingDone ? (
          <Link
            href="/onboarding"
            title="Guided setup"
            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-[var(--workspace-accent)] transition hover:bg-[var(--workspace-accent)]/10 ${
              path === "/onboarding" ? "bg-[var(--workspace-accent)]/12" : ""
            }`}
          >
            <Rocket className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            <span>{t("sidebar.getStarted")}</span>
          </Link>
        ) : null}

        <NavLink
          href="/desk"
          active={path === "/desk"}
          icon={PanelTop}
          label={t("sidebar.desk")}
        />
        <NavLink
          href="/projects"
          active={path === "/projects" || path.startsWith("/projects/")}
          icon={LayoutDashboard}
          label={t("sidebar.overview")}
        />
        <NavLink
          href="/integrations"
          active={path.startsWith("/integrations")}
          icon={Plug2}
          label={t("sidebar.integrations")}
        />
        <NavLink
          href="/workspace/apps"
          active={path.startsWith("/workspace/apps")}
          icon={Library}
          label={t("sidebar.library")}
        />
        <NavLink
          href="/workspace/customize"
          active={path.startsWith("/workspace/customize")}
          icon={SlidersHorizontal}
          label={t("sidebar.customize")}
        />
        <NavLink
          href="/settings"
          active={path === "/settings"}
          icon={Settings}
          label={t("sidebar.settings")}
        />

        <NavLink
          active={false}
          icon={MessageCircle}
          label={MERIDIAN_SHORT}
          onClick={() => window.dispatchEvent(new Event("route5:assistant-open"))}
        />
      </nav>

      <div className="mt-3 shrink-0 px-3">
        <button
          type="button"
          title="Create a new project"
          onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--workspace-border)] bg-transparent px-3 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)]"
        >
          <Plus className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
          <span>{t("sidebar.newProject")}</span>
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <div className="border-t border-[var(--workspace-border)]/80 pt-4">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
              {t("sidebar.projects")}
            </p>
            {!loadingProjects && projects.length > 0 ? (
              <span className="tabular-nums text-[10px] font-medium text-[var(--workspace-muted-fg)]">
                {t("sidebar.runs", {
                  projects: summary.projectCount,
                  runs: summary.extractionCount,
                })}
              </span>
            ) : null}
          </div>
          {loadingProjects ? (
            <p className="mt-3 px-1 text-[12px] text-[var(--workspace-muted-fg)]">{t("sidebar.loading")}</p>
          ) : projects.length === 0 ? (
            <p className="mt-3 rounded-lg border border-[var(--workspace-border)]/60 bg-[var(--workspace-canvas)]/30 px-3 py-2.5 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {t("sidebar.projectsEmpty", { newProject: t("sidebar.projectsEmptyNew") })}
            </p>
          ) : (
            <>
              {pinnedProjects.length > 0 ? (
                <>
                  <p className="mt-3 px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--workspace-muted-fg)]">
                    {t("sidebar.pinned")}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {pinnedProjects.map((p) => (
                      <SidebarProjectRow
                        key={p.id}
                        p={p}
                        active={activeProjectId === p.id}
                        exp={exp}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
              <ul className={`space-y-0.5 ${pinnedProjects.length > 0 ? "mt-2" : "mt-3"}`}>
                {(pinnedProjects.length > 0 ? otherProjects : allSorted).map((p) => (
                  <SidebarProjectRow
                    key={p.id}
                    p={p}
                    active={activeProjectId === p.id}
                    exp={exp}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto shrink-0 space-y-3 border-t border-[var(--workspace-border)]/70 bg-[var(--workspace-sidebar)]/80 px-3 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-center gap-3 text-[10px] font-medium text-[var(--workspace-muted-fg)]">
          <Link href="/docs" className="transition hover:text-[var(--workspace-fg)]">
            {t("sidebar.docs")}
          </Link>
          <span className="text-[var(--workspace-border)]" aria-hidden>
            ·
          </span>
          <Link href="/support" className="transition hover:text-[var(--workspace-fg)]">
            {t("sidebar.support")}
          </Link>
        </div>
        <WorkspaceInstallControls />
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-[10px] text-[var(--workspace-muted-fg)]">
          <Link href="/docs/privacy" className="transition hover:text-[var(--workspace-fg)]">
            {t("sidebar.privacy")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/docs/terms" className="transition hover:text-[var(--workspace-fg)]">
            {t("sidebar.terms")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/contact" className="transition hover:text-[var(--workspace-fg)]">
            {t("sidebar.contact")}
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}
