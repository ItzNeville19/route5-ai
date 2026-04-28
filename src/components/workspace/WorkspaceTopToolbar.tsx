"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { UserButton } from "@clerk/nextjs";
import {
  Bot,
  Building2,
  ChevronDown,
  CircleHelp,
  Download,
  Eye,
  History,
  Home,
  LayoutGrid,
  Mail,
  Palette,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import WorkspaceCustomizationModal from "@/components/workspace/WorkspaceCustomizationModal";
import WorkspaceHelpPanel from "@/components/workspace/WorkspaceHelpPanel";
import WorkspaceHeaderSearch from "@/components/workspace/WorkspaceHeaderSearch";
import { resolveWorkspaceSurfaceMode } from "@/lib/workspace-dashboard-mode";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";
import { resolveDesktopDownloadHref } from "@/lib/desktop-install-url";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ToolbarItem = {
  id: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  leadOnly?: boolean;
};

export default function WorkspaceTopToolbar() {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw?.split("?")[0] ?? "";
  const search = useSearchParams();
  const router = useRouter();
  const { orgRole, organizationName } = useWorkspaceData();
  const { prefs, workspacePaletteLight } = useWorkspaceExperience();
  const canLead = orgRole === "admin" || orgRole === "manager";

  const { openNewTask, openRunAgent, openSendUpdate } = useWorkspaceChromeActions();

  const surfaceMode = useMemo(
    () => resolveWorkspaceSurfaceMode(canLead, search.get("view"), prefs.defaultWorkspaceView),
    [canLead, search, prefs.defaultWorkspaceView]
  );

  /** Members cannot keep `view=admin` in the URL; surface stays employee via `resolveWorkspaceSurfaceMode`. */
  useEffect(() => {
    if (canLead) return;
    if (search.get("view") !== "admin") return;
    const p = new URLSearchParams(search.toString());
    p.delete("view");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [canLead, pathname, router, search]);

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [leadMenuPos, setLeadMenuPos] = useState<{ top: number; right: number } | null>(null);
  const leadBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const openCustomize = () => setCustomizeOpen(true);
    window.addEventListener("route5:open-customize", openCustomize);
    return () => window.removeEventListener("route5:open-customize", openCustomize);
  }, []);

  useEffect(() => {
    if (!leadOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeadOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leadOpen]);

  const syncLeadMenuPosition = useCallback(() => {
    const el = leadBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gutter = 8;
    setLeadMenuPos({
      top: r.bottom + 6,
      right: Math.max(gutter, typeof window !== "undefined" ? window.innerWidth - r.right : gutter),
    });
  }, []);

  useLayoutEffect(() => {
    if (!leadOpen) {
      setLeadMenuPos(null);
      return;
    }
    syncLeadMenuPosition();
    window.addEventListener("resize", syncLeadMenuPosition);
    window.addEventListener("scroll", syncLeadMenuPosition, true);
    return () => {
      window.removeEventListener("resize", syncLeadMenuPosition);
      window.removeEventListener("scroll", syncLeadMenuPosition, true);
    };
  }, [leadOpen, syncLeadMenuPosition]);

  const desktopDownloadHref = resolveDesktopDownloadHref();
  const desktopDownloadExternal = /^https?:\/\//i.test(desktopDownloadHref);
  const suffix = useMemo(() => {
    const params = new URLSearchParams(search.toString());
    params.set("view", surfaceMode);
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [search, surfaceMode]);

  const navItems: ToolbarItem[] = useMemo(
    () => [
      { id: "dashboard", href: `/workspace/dashboard${suffix}`, label: "Home", icon: Home },
      { id: "queue", href: `/workspace/agent${suffix}`, label: "Agent", icon: Bot, leadOnly: true },
      { id: "activity", href: `/workspace/activity${suffix}`, label: "History", icon: History },
    ],
    [suffix]
  );

  const visibleNav = navItems.filter((i) => !i.leadOnly || canLead);

  const goEmployeePreview = () => {
    /** `EmployeePreviewPanel` only renders on `/workspace/dashboard` (`Route5AdminDashboard`). Applying `view=employee` on other routes appeared to "do nothing." */
    const params = new URLSearchParams(search.toString());
    params.set("view", "employee");
    const qs = params.toString();
    router.push(qs ? `/workspace/dashboard?${qs}` : "/workspace/dashboard?view=employee");
    setLeadOpen(false);
  };

  const goLeadView = () => {
    const params = new URLSearchParams(search.toString());
    params.set("view", "admin");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : `${pathname}?view=admin`, { scroll: false });
  };

  const employeeToolbarCrowded = canLead && surfaceMode === "employee";

  /** Lead actions menu is always a dark floating panel — keep light menu copy regardless of canvas theme. */
  const leadMenuItem =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/90 transition hover:bg-white/[0.06]";

  return (
    <>
      <header className="route5-ocean-header sticky top-0 z-30 mb-0 px-3 pt-[max(0px,env(safe-area-inset-top,0px))] sm:px-4 lg:px-6">
        <div
          className={`route5-ocean-toolbar-surface route5-workspace-toolbar-shell relative overflow-hidden rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 ${
            employeeToolbarCrowded ? "route5-workspace-toolbar-employee-shrink" : ""
          }`}
        >
          <div
            className={`pointer-events-none absolute -left-20 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-3xl ${workspacePaletteLight ? "opacity-40" : ""}`}
            aria-hidden
          />
          <div
            className={`pointer-events-none absolute -right-12 -top-8 h-28 w-40 rounded-full bg-teal-500/[0.035] blur-3xl ${workspacePaletteLight ? "opacity-40" : ""}`}
            aria-hidden
          />

          <div className="route5-workspace-toolbar-inner relative flex min-h-[38px] items-center gap-2 sm:gap-3 md:min-h-[40px] lg:gap-3.5">
            {/* Left: brand + search */}
            <div className="flex min-w-0 min-h-0 flex-1 items-center gap-2 sm:gap-3">
              <Link
                href={`/workspace/dashboard${suffix}`}
                className={classNames(
                  "group flex shrink-0 items-baseline gap-1.5 rounded-md px-0.5 py-0 outline-none transition focus-visible:ring-2",
                  workspacePaletteLight
                    ? "ring-cyan-600/20 hover:bg-slate-900/5"
                    : "ring-cyan-400/25 hover:bg-white/[0.04]"
                )}
                aria-label="Route 5 Workspace — Home"
              >
                <span
                  className={classNames(
                    "text-[12px] font-semibold tracking-[-0.04em] sm:text-[13px]",
                    workspacePaletteLight ? "text-slate-900" : "text-white"
                  )}
                >
                  Route{" "}
                  <span className="bg-[linear-gradient(135deg,#a5f3fc_0%,#22d3ee_40%,#059669_95%)] bg-clip-text font-semibold text-transparent">
                    5
                  </span>
                </span>
                <span
                  className={classNames(
                    "hidden text-[9px] font-medium uppercase tracking-[0.16em] sm:inline",
                    workspacePaletteLight ? "text-slate-500" : "text-cyan-200/32"
                  )}
                >
                  Workspace
                </span>
              </Link>
              <WorkspaceHeaderSearch />
              {(canLead || organizationName) ? (
                <div
                  className={classNames(
                    "hidden min-w-0 shrink-0 flex-col gap-0.5 border-l pl-1.5 sm:flex sm:max-w-[min(42vw,280px)] sm:flex-row sm:items-center sm:gap-2 lg:max-w-none",
                    workspacePaletteLight ? "border-slate-300/45" : "border-white/[0.08]"
                  )}
                >
                  {canLead ? (
                    <Link
                      href="/companies"
                      className={classNames(
                        "inline-flex max-w-[120px] items-center gap-0.5 truncate rounded-md px-1 py-0.5 text-[10px] font-semibold outline-none transition focus-visible:ring-2 lg:max-w-none lg:text-[11px]",
                        workspacePaletteLight
                          ? "text-sky-700 ring-cyan-600/25 hover:bg-slate-900/6 hover:text-sky-900"
                          : "text-cyan-200/70 ring-cyan-400/25 hover:bg-white/[0.06] hover:text-cyan-100"
                      )}
                      title="Companies — browse or add a workspace"
                    >
                      <Building2 className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span className="truncate">Companies</span>
                    </Link>
                  ) : null}
                  {organizationName ? (
                    <span
                      className={classNames(
                        "truncate text-[10px] font-semibold leading-tight lg:text-[11px]",
                        workspacePaletteLight ? "text-slate-700" : "text-cyan-50/88"
                      )}
                      title={organizationName}
                    >
                      {organizationName}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Center: primary nav (icons + labels from md to reduce dead space) */}
            <nav
              aria-label="Workspace"
              className="route5-workspace-toolbar-nav hidden min-w-0 shrink items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:max-w-[min(44vw,540px)] md:justify-center md:gap-1.5 xl:max-w-none [&::-webkit-scrollbar]:hidden"
            >
              {visibleNav.map((item) => {
                const itemBase = item.href.split("?")[0];
                const active =
                  pathname === itemBase || (itemBase !== "/" && pathname.startsWith(`${itemBase}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.label}
                    className={classNames(
                      "route5-nav-row inline-flex min-h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none md:h-9 md:text-[11px]",
                      workspacePaletteLight
                        ? active
                          ? "border border-sky-400/35 bg-slate-900/8 text-slate-900"
                          : "border border-transparent bg-transparent text-slate-600 hover:bg-slate-900/6 hover:text-slate-900"
                        : active
                          ? "border border-cyan-400/25 bg-white/[0.07] text-white"
                          : "border border-transparent bg-transparent text-cyan-100/48 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: lead overflow, notifications, customize, help, account */}
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <nav
                aria-label="Workspace mobile"
                className="flex max-w-[min(46vw,220px)] items-center gap-1 overflow-x-auto pr-0.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleNav.map((item) => {
                  const itemBase = item.href.split("?")[0];
                  const active =
                    pathname === itemBase || (itemBase !== "/" && pathname.startsWith(`${itemBase}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.label}
                      className={classNames(
                        "route5-nav-row inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-full border px-2 text-[10px] font-semibold",
                        workspacePaletteLight
                          ? active
                            ? "border-sky-400/35 bg-slate-900/8 text-slate-900"
                            : "border-transparent text-slate-600 hover:bg-slate-900/6 hover:text-slate-900"
                          : active
                            ? "border-cyan-400/25 bg-white/[0.07] text-white"
                            : "border-transparent text-cyan-100/48 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 opacity-90" />
                    </Link>
                  );
                })}
              </nav>

              {canLead && surfaceMode === "employee" ? (
                <button
                  type="button"
                  onClick={goLeadView}
                  className={classNames(
                    "route5-pressable inline-flex max-w-[min(100vw,11rem)] shrink-0 items-center justify-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight transition sm:max-w-none sm:px-2.5 sm:text-[11px]",
                    workspacePaletteLight
                      ? "border-sky-400/45 bg-sky-500/15 text-sky-900 shadow-none hover:border-sky-400/55 hover:bg-sky-500/22"
                      : "border-cyan-400/35 bg-cyan-500/[0.12] text-cyan-50 shadow-[inset_0_1px_0_rgba(167,243,238,0.12)] hover:border-cyan-300/40 hover:bg-cyan-500/[0.18]"
                  )}
                  title="Return to organization metrics and Lead tools"
                >
                  <span className="sm:hidden">Team view</span>
                  <span className="hidden sm:inline">Back to team overview</span>
                </button>
              ) : null}

              {canLead ? (
                <div className="relative shrink-0">
                  <button
                    ref={leadBtnRef}
                    type="button"
                    id="workspace-lead-actions-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeadOpen((o) => !o);
                    }}
                    className={classNames(
                      "route5-pressable inline-flex h-7 items-center gap-0.5 rounded-full border px-2 text-[10px] font-semibold transition sm:px-2.5 sm:text-[11px]",
                      workspacePaletteLight
                        ? "border-slate-300/65 bg-white/75 text-slate-800 hover:border-slate-400/8 hover:bg-white"
                        : "border-white/[0.08] bg-black/28 text-cyan-50/95 hover:border-cyan-400/28 hover:bg-white/[0.05]"
                    )}
                    aria-expanded={leadOpen}
                    aria-haspopup="menu"
                    aria-controls={leadOpen ? "workspace-lead-actions-menu" : undefined}
                  >
                    Actions
                    <ChevronDown className={classNames("h-3 w-3 opacity-80 transition", leadOpen && "rotate-180")} />
                  </button>
                  {mounted &&
                    leadOpen &&
                    leadMenuPos &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[998] bg-black/20 backdrop-blur-[1px]"
                          aria-hidden
                          onClick={() => setLeadOpen(false)}
                        />
                        <div
                          id="workspace-lead-actions-menu"
                          role="menu"
                          aria-labelledby="workspace-lead-actions-trigger"
                          className="fixed z-[999] min-w-[220px] max-w-[min(288px,calc(100vw-16px))] rounded-xl border border-white/[0.12] bg-[#0a1214]/98 py-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md"
                          style={{
                            top: leadMenuPos.top,
                            right: leadMenuPos.right,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => {
                              openNewTask();
                              setLeadOpen(false);
                            }}
                          >
                            <PlusCircle className="h-4 w-4 text-cyan-300/85" strokeWidth={2} />
                            New Task
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => {
                              openRunAgent();
                              setLeadOpen(false);
                            }}
                          >
                            <Sparkles className="h-4 w-4 text-emerald-300/85" strokeWidth={2} />
                            Run Agent
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => {
                              openSendUpdate();
                              setLeadOpen(false);
                            }}
                          >
                            <Mail className="h-4 w-4 text-teal-200/80" strokeWidth={2} />
                            Send Update
                          </button>
                          <button type="button" role="menuitem" className={leadMenuItem} onClick={() => goEmployeePreview()}>
                            <Eye className="h-4 w-4 text-white/70" strokeWidth={2} />
                            Employee Preview
                          </button>
                          <Link
                            href="/workspace/organization"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <Users className="h-4 w-4 text-cyan-200/85" strokeWidth={2} />
                            Organization
                          </Link>
                          <Link
                            href="/?site=1"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <LayoutGrid className="h-4 w-4 text-emerald-200/90" strokeWidth={2} />
                            Marketing site
                          </Link>
                          {desktopDownloadExternal ? (
                            <a
                              href={desktopDownloadHref}
                              role="menuitem"
                              className={leadMenuItem}
                              onClick={() => setLeadOpen(false)}
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4 text-cyan-200/85" strokeWidth={2} />
                              Download desktop client
                            </a>
                          ) : (
                            <Link
                              href={desktopDownloadHref}
                              role="menuitem"
                              className={leadMenuItem}
                              onClick={() => setLeadOpen(false)}
                            >
                              <Download className="h-4 w-4 text-cyan-200/85" strokeWidth={2} />
                              Download desktop client
                            </Link>
                          )}
                          <Link
                            href="/settings"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <Settings className="h-4 w-4 text-cyan-200/85" strokeWidth={2} />
                            Settings
                          </Link>
                        </div>
                      </>,
                      document.body
                    )}
                </div>
              ) : null}

              <WorkspaceNotificationsPopover variant={workspacePaletteLight ? "oceanLight" : "ocean"} />

              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className={classNames(
                  "route5-pressable inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition",
                  workspacePaletteLight
                    ? "border-slate-300/55 bg-white/85 text-slate-800 hover:border-slate-400/8 hover:bg-white"
                    : "border-white/20 bg-black/50 text-white hover:border-white/35 hover:bg-black/65 hover:text-white"
                )}
                aria-label="Customize workspace"
                title="Customize"
              >
                <Palette className="h-3.5 w-3.5" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className={classNames(
                  "route5-pressable inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition",
                  workspacePaletteLight
                    ? "border-slate-300/55 bg-white/85 text-slate-800 hover:border-slate-400/8 hover:bg-white"
                    : "border-white/20 bg-black/50 text-white hover:border-white/35 hover:bg-black/65 hover:text-white"
                )}
                aria-label="Help"
                title="Help"
              >
                <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>

              {!canLead ? (
                <Link
                  href="/settings"
                  className={classNames(
                    "route5-pressable inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition",
                    workspacePaletteLight
                      ? "border-slate-300/55 bg-white/85 text-slate-800 hover:border-slate-400/8 hover:bg-white"
                      : "border-white/20 bg-black/50 text-white hover:border-white/35 hover:bg-black/65 hover:text-white"
                  )}
                  aria-label="Settings"
                  title="Route5 settings"
                >
                  <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              ) : null}

              <div
                className={classNames(
                  "flex h-7 w-7 items-center justify-center rounded-full border",
                  workspacePaletteLight
                    ? "border-slate-300/45 bg-white/90 shadow-sm"
                    : "border-white/[0.06] bg-black/30"
                )}
              >
                <UserButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <WorkspaceCustomizationModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      <WorkspaceHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
