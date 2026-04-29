"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { UserButton } from "@clerk/nextjs";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
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
import { useI18n } from "@/components/i18n/I18nProvider";
import { motion, useReducedMotion } from "framer-motion";

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
  const { t } = useI18n();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw?.split("?")[0] ?? "";
  const search = useSearchParams();
  const router = useRouter();
  const { orgRole, organizationName } = useWorkspaceData();
  const { prefs, workspacePaletteLight } = useWorkspaceExperience();
  const canLead = orgRole === "admin" || orgRole === "manager";

  const { openNewTask, openRunAgent, openSendUpdate } = useWorkspaceChromeActions();
  const reduceMotion = useReducedMotion();

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
      {
        id: "dashboard",
        href: `/workspace/dashboard${suffix}`,
        label: t("workspace.chrome.nav.home"),
        icon: Home,
      },
      {
        id: "queue",
        href: `/workspace/agent${suffix}`,
        label: t("workspace.chrome.nav.agent"),
        icon: Bot,
        leadOnly: true,
      },
      {
        id: "activity",
        href: `/workspace/activity${suffix}`,
        label: t("workspace.chrome.nav.history"),
        icon: History,
      },
    ],
    [suffix, t]
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

  /** Lead actions menu is always a dark floating panel — keep light menu copy regardless of canvas theme. */
  const leadMenuItem =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/90 transition hover:bg-white/[0.06]";

  const leadMenuIcon = (wrap: string, iconClass: string) =>
    `flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${wrap} ${iconClass}`;

  return (
    <>
      <motion.header
        className="route5-ocean-header sticky top-0 z-30 mb-0 px-3 pt-[max(0px,env(safe-area-inset-top,0px))] sm:px-4 lg:px-6"
        initial={reduceMotion ? false : { opacity: 0.92, y: -6 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.6 }}
      >
        {/*
          Light themes: **do not** use `.route5-ocean-toolbar-surface` — its ocean gradient + backdrop
          stacks poorly on Safari/macOS and reads as black-on-black despite overrides.
          Dark themes keep the ocean glass surface.
        */}
        <motion.div
          className={
            workspacePaletteLight
              ? "route5-workspace-toolbar-shell route5-workspace-toolbar-shell-3d relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-slate-900 shadow-[0_12px_44px_-28px_rgba(15,23,42,0.22)] sm:px-4 sm:py-2"
              : "route5-ocean-toolbar-surface route5-workspace-toolbar-shell route5-workspace-toolbar-shell-3d relative overflow-hidden rounded-xl px-2 py-1.5 sm:px-4 sm:py-2"
          }
          style={{ transformStyle: "preserve-3d" }}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  boxShadow:
                    workspacePaletteLight
                      ? "0 18px 50px -28px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.95)"
                      : "0 22px 60px -28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                }
          }
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        >
          {!workspacePaletteLight ? (
            <>
              <div
                className="pointer-events-none absolute -left-20 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-12 -top-8 h-28 w-40 rounded-full bg-teal-500/[0.035] blur-3xl"
                aria-hidden
              />
            </>
          ) : null}

          <div className="route5-workspace-toolbar-inner relative z-[1] flex min-h-[40px] w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto sm:min-h-[42px] sm:gap-2 md:gap-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="shrink-0">
              <Link
                href={`/workspace/dashboard${suffix}`}
                className={classNames(
                  "group flex shrink-0 items-baseline gap-1.5 rounded-md px-0.5 py-0 outline-none transition focus-visible:ring-2",
                  workspacePaletteLight
                    ? "ring-cyan-600/20 hover:bg-slate-900/5"
                    : "ring-cyan-400/25 hover:bg-white/[0.04]"
                )}
                aria-label={t("workspace.chrome.brandAria")}
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
                  {t("workspace.chrome.workspaceLabel")}
                </span>
              </Link>
            </motion.div>

            <div className="flex min-h-0 min-w-0 flex-1 basis-0 justify-start px-0.5 sm:px-1">
              <WorkspaceHeaderSearch fill />
            </div>

            <nav
              aria-label={t("workspace.chrome.nav.aria")}
              className="route5-workspace-toolbar-nav mx-0 flex min-w-0 min-h-0 shrink-0 items-center justify-center gap-0.5 sm:gap-1 md:max-w-[min(52vw,420px)] md:gap-1.5 lg:max-w-[min(44vw,520px)]"
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

            <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-1.5">
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
                  title={t("workspace.chrome.backToTeamTitle")}
                >
                  <span className="sm:hidden">{t("workspace.chrome.teamViewShort")}</span>
                  <span className="hidden sm:inline">{t("workspace.chrome.backToTeam")}</span>
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
                    {t("workspace.chrome.actions")}
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
                          {canLead && organizationName ? (
                            <div
                              className="mb-1 border-b border-white/[0.1] px-3 pb-2 text-[11px] font-medium leading-snug text-white/55"
                              role="presentation"
                            >
                              {organizationName}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => {
                              openNewTask();
                              setLeadOpen(false);
                            }}
                          >
                            <span
                              className={leadMenuIcon(
                                "bg-sky-500/18 ring-sky-400/25",
                                "[&>svg]:text-sky-200"
                              )}
                            >
                              <PlusCircle className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.newTask")}
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
                            <span
                              className={leadMenuIcon(
                                "bg-emerald-500/18 ring-emerald-400/20",
                                "[&>svg]:text-emerald-200"
                              )}
                            >
                              <Sparkles className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.runAgent")}
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
                            <span
                              className={leadMenuIcon(
                                "bg-amber-500/16 ring-amber-400/25",
                                "[&>svg]:text-amber-200"
                              )}
                            >
                              <Mail className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.sendUpdate")}
                          </button>
                          <button type="button" role="menuitem" className={leadMenuItem} onClick={() => goEmployeePreview()}>
                            <span
                              className={leadMenuIcon(
                                "bg-violet-500/18 ring-violet-400/25",
                                "[&>svg]:text-violet-200"
                              )}
                            >
                              <Eye className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.employeePreview")}
                          </button>
                          <Link
                            href="/workspace/organization"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <span
                              className={leadMenuIcon(
                                "bg-indigo-500/20 ring-indigo-400/22",
                                "[&>svg]:text-indigo-200"
                              )}
                            >
                              <Users className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.organization")}
                          </Link>
                          <Link
                            href="/companies"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <span
                              className={leadMenuIcon(
                                "bg-orange-500/16 ring-orange-400/25",
                                "[&>svg]:text-orange-200"
                              )}
                            >
                              <Building2 className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.companies")}
                          </Link>
                          <Link
                            href="/?site=1"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <span
                              className={leadMenuIcon(
                                "bg-fuchsia-500/16 ring-fuchsia-400/25",
                                "[&>svg]:text-fuchsia-200"
                              )}
                            >
                              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.marketingSite")}
                          </Link>
                          {desktopDownloadExternal ? (
                            <a
                              href={desktopDownloadHref}
                              role="menuitem"
                              className={leadMenuItem}
                              onClick={() => setLeadOpen(false)}
                              rel="noopener noreferrer"
                            >
                              <span
                                className={leadMenuIcon(
                                  "bg-cyan-500/18 ring-cyan-400/25",
                                  "[&>svg]:text-cyan-200"
                                )}
                              >
                                <Download className="h-4 w-4" strokeWidth={2} />
                              </span>
                              {t("workspace.chrome.lead.downloadDesktop")}
                            </a>
                          ) : (
                            <Link
                              href={desktopDownloadHref}
                              role="menuitem"
                              className={leadMenuItem}
                              onClick={() => setLeadOpen(false)}
                            >
                              <span
                                className={leadMenuIcon(
                                  "bg-cyan-500/18 ring-cyan-400/25",
                                  "[&>svg]:text-cyan-200"
                                )}
                              >
                                <Download className="h-4 w-4" strokeWidth={2} />
                              </span>
                              {t("workspace.chrome.lead.downloadDesktop")}
                            </Link>
                          )}
                          <Link
                            href="/settings"
                            role="menuitem"
                            className={leadMenuItem}
                            onClick={() => setLeadOpen(false)}
                          >
                            <span
                              className={leadMenuIcon(
                                "bg-zinc-600/45 ring-zinc-500/35",
                                "[&>svg]:text-zinc-200"
                              )}
                            >
                              <Settings className="h-4 w-4" strokeWidth={2} />
                            </span>
                            {t("workspace.chrome.lead.settings")}
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
                aria-label={t("workspace.chrome.customize")}
                title={t("workspace.chrome.customize")}
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
                aria-label={t("workspace.chrome.help")}
                title={t("workspace.chrome.help")}
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
                  aria-label={t("workspace.chrome.settings")}
                  title={t("workspace.chrome.settings")}
                >
                  <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              ) : null}

              {!canLead && organizationName ? (
                <span
                  className={classNames(
                    "hidden max-w-[5.5rem] shrink truncate text-[10px] font-semibold leading-tight sm:inline md:max-w-[10rem]",
                    workspacePaletteLight ? "text-slate-600" : "text-cyan-100/80"
                  )}
                  title={organizationName}
                >
                  {organizationName}
                </span>
              ) : null}

              <div
                className={classNames(
                  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                  workspacePaletteLight
                    ? "ring-1 ring-slate-300/50"
                    : "ring-1 ring-white/15"
                )}
              >
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/settings"
                  appearance={{
                    ...route5ClerkAppearance,
                    elements: {
                      ...route5ClerkAppearance.elements,
                      avatarBox: "h-8 w-8 overflow-hidden rounded-full",
                      userButtonAvatarImage: "h-full w-full object-cover",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.header>

      <WorkspaceCustomizationModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      <WorkspaceHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
