"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  BookOpen,
  ChevronRight,
  Database,
  FolderOpen,
  LayoutGrid,
  LifeBuoy,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  PanelTop,
  Pin,
  PinOff,
  Plug2,
  Plus,
  Proportions,
  Rocket,
  Search,
  Settings,
} from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { MERIDIAN_SHORT } from "@/lib/assistant-brand";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { PRODUCT_MISSION } from "@/lib/product-truth";
import type { Project } from "@/lib/types";
import WorkspaceSidebarHistory from "@/components/app/WorkspaceSidebarHistory";
import WorkspaceSidebarShortcuts from "@/components/app/WorkspaceSidebarShortcuts";

const tierLabel =
  process.env.NEXT_PUBLIC_WORKSPACE_TIER_PRIMARY?.trim() || "Pro";
const repoSlug =
  process.env.NEXT_PUBLIC_WORKSPACE_REPO_SLUG?.trim() || "route5-ai";

type HealthSnap = {
  openaiConfigured?: boolean;
  linearConfigured?: boolean;
  githubConfigured?: boolean;
  storageBackend?: "supabase" | "sqlite";
  extractionMode?: "ai" | "offline";
};

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
        className={`flex items-center gap-0.5 rounded-md ${
          active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
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

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthSnap | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        projects?: Project[];
      };
      if (res.ok) setProjects(data.projects ?? []);
      else setProjects([]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener("route5:project-updated", onRefresh);
    return () => window.removeEventListener("route5:project-updated", onRefresh);
  }, [load]);

  useEffect(() => {
    void fetch("/api/health", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setHealth(d as HealthSnap))
      .catch(() => setHealth({}));
  }, [pathname]);

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

  const handle =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "you";
  const repoPath = `${handle}/${repoSlug}`;
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  const firstProject = projects[0];
  const activeLabel = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)?.name ??
      "Current project"
    : firstProject?.name ?? "Workspace";

  const navBtn =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition";
  const navIdle =
    "text-[var(--workspace-muted-fg)] hover:bg-white/[0.05]";
  const navActive = "bg-white/[0.08] text-[var(--workspace-fg)]";

  const collapsed = Boolean(exp.prefs.sidebarCollapsed);
  const hideWhenCollapsed = collapsed ? "md:opacity-0 md:transition-opacity md:duration-200 md:group-hover/sidebar:opacity-100" : "";
  const onboardingDone = user?.id ? isOnboardingComplete(user.id) : false;

  return (
    <aside
      className={`agent-sidebar group/sidebar relative z-20 order-2 flex h-[100dvh] max-h-[100dvh] w-full shrink-0 flex-col overflow-hidden border-b border-[var(--workspace-border)] bg-[var(--workspace-sidebar)]/65 backdrop-blur-2xl md:order-1 md:h-auto md:max-h-none md:min-h-dvh md:border-b-0 md:border-r md:transition-[width] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "md:z-30 md:w-[76px] md:hover:z-[50] md:hover:w-[272px] md:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.45)]" : "md:w-[272px]"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-1 px-3 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/projects"
            className="block truncate text-[15px] font-semibold tracking-tight text-[var(--workspace-fg)]"
          >
            {PRODUCT_MISSION.name}
          </Link>
          <p
            className={`mt-1 text-[11px] leading-snug text-[var(--workspace-muted-fg)] ${hideWhenCollapsed}`}
          >
            {PRODUCT_MISSION.sidebarTagline}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exp.setPrefs({ sidebarCollapsed: !exp.prefs.sidebarCollapsed })}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--workspace-border)]/70 bg-[var(--workspace-canvas)]/50 text-[var(--workspace-muted-fg)] shadow-sm transition hover:bg-white/[0.08] hover:text-[var(--workspace-fg)] md:inline-flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className={`h-4 w-4 ${collapsed ? "" : "rotate-180"}`} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {!onboardingDone ? (
        <div className="shrink-0 px-2">
          <Link
            href="/onboarding"
            title="Start here — guided setup"
            className={`${navBtn} ${pathname === "/onboarding" ? navActive : navIdle} border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/10 ${collapsed ? "md:justify-center" : ""}`}
          >
            <Rocket className="h-4 w-4 shrink-0 text-[var(--workspace-accent)]" strokeWidth={1.75} />
            <span className={collapsed ? "md:sr-only" : undefined}>Start here</span>
          </Link>
        </div>
      ) : null}
      <div className="shrink-0 px-2 pt-1">
        <button
          type="button"
          onClick={() => openPalette()}
          className={`flex w-full items-center gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-left text-[13px] text-[var(--workspace-muted-fg)] shadow-sm transition hover:bg-white/[0.05] ${collapsed ? "md:justify-center" : ""}`}
          aria-label="Command palette"
        >
          <Search className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
          <span className={`flex-1 truncate ${collapsed ? "md:sr-only" : ""}`}>Search…</span>
          <kbd
            className={`shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--workspace-muted-fg)] ${collapsed ? "md:hidden" : ""}`}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <div
        className={`mt-2 grid shrink-0 gap-2 px-2 ${collapsed ? "md:grid-cols-1" : "grid-cols-2"}`}
      >
        <Link
          href="/desk"
          title="Desk"
          className={`${navBtn} justify-center ${pathname === "/desk" ? navActive : navIdle} ${collapsed ? "md:px-2" : ""}`}
        >
          <PanelTop className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
          <span className={collapsed ? "md:sr-only" : undefined}>Desk</span>
        </Link>
        <Link
          href="/marketplace"
          title="Marketplace"
          className={`${navBtn} justify-center ${
            pathname === "/marketplace" || pathname?.startsWith("/marketplace/")
              ? navActive
              : navIdle
          } ${collapsed ? "md:px-2" : ""}`}
        >
          <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
          <span className={collapsed ? "md:sr-only" : undefined}>Apps</span>
        </Link>
      </div>

      <div className="mt-3 shrink-0 px-2">
        <Link
          href="/projects#new-project"
          title="New project"
          className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2.5 text-[13px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:bg-white/[0.05] ${collapsed ? "md:justify-center" : ""}`}
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 opacity-80" strokeWidth={2} />
            <span className={collapsed ? "md:sr-only" : undefined}>New project</span>
          </span>
          <kbd
            className={`rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--workspace-muted-fg)] ${collapsed ? "md:hidden" : ""}`}
          >
            ⌘N
          </kbd>
        </Link>
      </div>

      <div className="mt-2 shrink-0 px-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("route5:assistant-open"))}
          title={`${MERIDIAN_SHORT} chat`}
          className={`flex w-full items-center gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-3 py-2.5 text-left text-[13px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/30 hover:bg-[var(--workspace-surface)] ${collapsed ? "md:justify-center" : ""}`}
        >
          <MessageCircle className="h-4 w-4 shrink-0 text-[#34c759]" strokeWidth={2} aria-hidden />
          <span className={collapsed ? "md:sr-only" : undefined}>{MERIDIAN_SHORT}</span>
          <span
            className={`ml-auto text-[10px] font-medium text-[var(--workspace-muted-fg)] ${collapsed ? "md:hidden" : ""}`}
          >
            Chat
          </span>
        </button>
      </div>

      <Link
        href="/integrations"
        title="Integrations"
        className={`${navBtn} ${pathname?.startsWith("/integrations") ? navActive : navIdle} mx-2 mt-1 shrink-0 ${collapsed ? "md:justify-center" : ""}`}
      >
        <Plug2 className="h-4 w-4 opacity-70" strokeWidth={1.75} />
        <span className={collapsed ? "md:sr-only" : undefined}>Integrations</span>
      </Link>

      <Link
        href="/docs"
        title="Documentation"
        className={`${navBtn} ${pathname?.startsWith("/docs") ? navActive : navIdle} mx-2 mt-1 shrink-0 ${collapsed ? "md:justify-center" : ""}`}
      >
        <BookOpen className="h-4 w-4 opacity-70" strokeWidth={1.75} />
        <span className={collapsed ? "md:sr-only" : undefined}>Docs</span>
      </Link>

      <Link
        href="/support"
        title="Support"
        className={`${navBtn} ${pathname === "/support" ? navActive : navIdle} mx-2 mt-1 shrink-0 ${collapsed ? "md:justify-center" : ""}`}
      >
        <LifeBuoy className="h-4 w-4 opacity-70" strokeWidth={1.75} />
        <span className={collapsed ? "md:sr-only" : undefined}>Support</span>
      </Link>

      <WorkspaceSidebarHistory collapsed={collapsed} />
      <WorkspaceSidebarShortcuts collapsed={collapsed} />

      <div
        className={`mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-1 ${
          collapsed ? "md:hidden md:group-hover/sidebar:block" : ""
        }`}
      >
        <div className="border-t border-[var(--workspace-border)] pt-4">
          <p
            className={`px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)] ${hideWhenCollapsed}`}
          >
            Workspace
          </p>
          <p
            className={`mt-1 truncate px-2 font-mono text-[11px] text-[var(--workspace-muted-fg)] ${hideWhenCollapsed}`}
          >
            {repoPath}
          </p>
          <div className="mt-2 px-2">
            <div className="flex items-start gap-2 rounded-md px-2 py-1.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--workspace-muted-fg)] opacity-60"
                aria-hidden
              />
              <span className="line-clamp-2 text-[13px] leading-snug text-[var(--workspace-fg)]">
                {loading ? "Loading…" : activeLabel}
              </span>
            </div>
          </div>
          <Link
            href={
              firstProject
                ? `/projects/${firstProject.id}`
                : "/projects#new-project"
            }
            title={
              firstProject
                ? `Open ${firstProject.name}`
                : "Create a project on the projects page"
            }
            className={`${navBtn} ${navIdle} mt-1 ${collapsed ? "md:justify-center" : ""}`}
          >
            <FolderOpen className="h-4 w-4 text-neutral-500" strokeWidth={1.75} />
            <span className={collapsed ? "md:sr-only" : undefined}>
              {firstProject ? "Open workspace" : "Create project"}
            </span>
            <ChevronRight className={`ml-auto h-4 w-4 opacity-40 ${collapsed ? "md:hidden" : ""}`} aria-hidden />
          </Link>
        </div>

        <div className="mt-5">
        {loading ? (
          <p className="mt-2 px-2 text-[12px] text-[var(--workspace-muted-fg)]">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="mt-2 px-2 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
            No projects yet.
          </p>
        ) : (
          <>
            {pinnedProjects.length > 0 ? (
              <>
                <p
                  className={`px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)] ${hideWhenCollapsed}`}
                >
                  Pinned
                </p>
                <ul className="mt-1 space-y-0.5">
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
            <p
              className={`px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)] ${
                pinnedProjects.length > 0 ? "mt-4" : ""
              } ${hideWhenCollapsed}`}
            >
              Projects
            </p>
            <ul className="mt-1 space-y-0.5">
              {(pinnedProjects.length > 0 ? otherProjects : allSorted).map((p) => (
                <SidebarProjectRow
                  key={p.id}
                  p={p}
                  active={activeProjectId === p.id}
                  exp={exp}
                />
              ))}
            </ul>
            {pinnedProjects.length === 0 ? (
              <p className="mt-2 px-2 text-[11px] leading-snug text-[var(--workspace-muted-fg)]">
                Pin any project to keep it here.
              </p>
            ) : null}
          </>
        )}
        </div>
      </div>

      <div
        className={`mx-2 mb-2 shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.12] to-white/[0.04] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl dark:from-white/[0.06] dark:to-white/[0.02] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
          collapsed ? "md:hidden md:group-hover/sidebar:block" : ""
        }`}
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
          Display
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => exp.setPrefs({ compact: !exp.prefs.compact })}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
              exp.prefs.compact
                ? "bg-[var(--workspace-accent)]/15 text-[var(--workspace-fg)]"
                : "text-[var(--workspace-muted-fg)] hover:bg-white/[0.06]"
            }`}
            aria-pressed={Boolean(exp.prefs.compact)}
          >
            <Proportions className="h-3 w-3 opacity-70" aria-hidden />
            Compact
          </button>
          <button
            type="button"
            onClick={() => exp.setPrefs({ focusMode: !exp.prefs.focusMode })}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
              exp.prefs.focusMode
                ? "bg-[var(--workspace-accent)]/15 text-[var(--workspace-fg)]"
                : "text-[var(--workspace-muted-fg)] hover:bg-white/[0.06]"
            }`}
            aria-pressed={Boolean(exp.prefs.focusMode)}
          >
            <PanelLeftClose className="h-3 w-3 opacity-70" aria-hidden />
            Focus
          </button>
        </div>
        <Link
          href="/integrations"
          className="mt-2.5 flex items-start gap-2 rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/35 p-2 text-left transition hover:border-[var(--workspace-accent)]/35"
        >
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-[var(--workspace-fg)]">
              Connections
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-[var(--workspace-muted-fg)]">
              Data: {health?.storageBackend === "supabase" ? "Cloud" : "Local"} ·{" "}
              {health?.extractionMode === "ai" ? "AI runs" : "Offline runs"}
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 opacity-40" aria-hidden />
        </Link>
        <p className="mt-2.5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
          Account &amp; legal
        </p>
        <nav
          className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-medium"
          aria-label="Account and legal"
        >
          <Link href="/settings" className="rounded-md px-1.5 py-1 text-[var(--workspace-muted-fg)] hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]">
            Settings
          </Link>
          <Link href="/account/plans" className="rounded-md px-1.5 py-1 text-[var(--workspace-muted-fg)] hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]">
            Billing
          </Link>
          <Link href="/docs/privacy" className="rounded-md px-1.5 py-1 text-[var(--workspace-muted-fg)] hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]">
            Privacy
          </Link>
          <Link href="/docs/terms" className="rounded-md px-1.5 py-1 text-[var(--workspace-muted-fg)] hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]">
            Terms
          </Link>
          <Link href="/contact" className="col-span-2 rounded-md px-1.5 py-1 text-[var(--workspace-muted-fg)] hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]">
            Contact
          </Link>
        </nav>
      </div>

      <div className="mt-auto shrink-0 border-t border-[var(--workspace-border)]/80 bg-[var(--workspace-sidebar)]/80 p-3 backdrop-blur-xl">
        <div className={`flex items-start gap-2.5 ${collapsed ? "md:justify-center" : ""}`}>
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/settings"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-1 ring-[var(--workspace-border)]",
              },
            }}
          />
          <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
            <p className="truncate text-[13px] font-semibold text-[var(--workspace-fg)]">
              {displayName}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-[11px] text-[var(--workspace-muted-fg)]">{tierLabel} plan</p>
              <Link
                href="/account/plans"
                className="text-[11px] font-medium text-[var(--workspace-accent)] hover:underline"
              >
                Plans
              </Link>
            </div>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-md p-1.5 text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
