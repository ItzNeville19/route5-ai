"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { UserButton } from "@clerk/nextjs";
import {
  Bot,
  ChevronDown,
  CircleHelp,
  Eye,
  History,
  Home,
  ListChecks,
  Mail,
  Palette,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import WorkspaceCustomizationModal from "@/components/workspace/WorkspaceCustomizationModal";
import WorkspaceHelpPanel from "@/components/workspace/WorkspaceHelpPanel";
import WorkspaceHeaderSearch from "@/components/workspace/WorkspaceHeaderSearch";
import { resolveWorkspaceSurfaceMode } from "@/lib/workspace-dashboard-mode";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";

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
  const { orgRole } = useWorkspaceData();
  const { prefs } = useWorkspaceExperience();
  const canLead = orgRole === "admin" || orgRole === "manager";

  const { openNewTask, openRunAgent, openSendUpdate } = useWorkspaceChromeActions();

  const surfaceMode = useMemo(
    () => resolveWorkspaceSurfaceMode(canLead, search.get("view"), prefs.defaultWorkspaceView),
    [canLead, search, prefs.defaultWorkspaceView]
  );

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const leadWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leadOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (leadWrapRef.current && !leadWrapRef.current.contains(e.target as Node)) setLeadOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [leadOpen]);

  const suffix = useMemo(() => {
    const params = new URLSearchParams(search.toString());
    params.set("view", surfaceMode);
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [search, surfaceMode]);

  const agentHref = useMemo(() => {
    const params = new URLSearchParams(search.toString());
    params.set("view", surfaceMode);
    const text = params.toString();
    return text ? `/workspace/agent?${text}` : "/workspace/agent";
  }, [search, surfaceMode]);

  const navItems: ToolbarItem[] = useMemo(
    () => [
      { id: "dashboard", href: `/workspace/dashboard${suffix}`, label: "Home", icon: Home },
      { id: "queue", href: `/workspace/agent${suffix}`, label: "Assistant", icon: Bot, leadOnly: true },
      { id: "activity", href: `/workspace/activity${suffix}`, label: "History", icon: History },
      { id: "preview", href: `/workspace/preview`, label: "Preview", icon: Eye },
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

  const menuItem =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/90 transition hover:bg-white/[0.06]";

  return (
    <>
      <header className="route5-ocean-header sticky top-0 z-30 mb-0 px-px">
        <div className="route5-ocean-toolbar-surface relative overflow-hidden rounded-xl px-1 py-0 sm:px-2 sm:py-0.5">
          <div className="pointer-events-none absolute -left-20 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-12 -top-8 h-28 w-40 rounded-full bg-teal-500/[0.035] blur-3xl" aria-hidden />

          <div className="relative flex min-h-[28px] flex-nowrap items-center gap-1 sm:gap-1.5 md:gap-2">
            {/* Left: brand + search */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <Link
                href={`/workspace/dashboard${suffix}`}
                className="group flex shrink-0 items-baseline gap-1.5 rounded-md px-0.5 py-0 outline-none ring-cyan-400/25 transition hover:bg-white/[0.04] focus-visible:ring-2"
                aria-label="Route 5 Workspace — Home"
              >
                <span className="text-[12px] font-semibold tracking-[-0.04em] text-white sm:text-[13px]">
                  Route{" "}
                  <span className="bg-[linear-gradient(135deg,#a5f3fc_0%,#22d3ee_40%,#059669_95%)] bg-clip-text font-semibold text-transparent">
                    5
                  </span>
                </span>
                <span className="hidden text-[9px] font-medium uppercase tracking-[0.16em] text-cyan-200/32 sm:inline">
                  Workspace
                </span>
              </Link>
              <WorkspaceHeaderSearch />
            </div>

            {/* Center: primary nav */}
            <nav
              aria-label="Workspace"
              className="hidden min-w-0 max-w-[min(52vw,520px)] shrink items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:justify-center [&::-webkit-scrollbar]:hidden"
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
                      "route5-nav-row inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold md:h-7 md:gap-1 md:px-2 md:text-[11px]",
                      active
                        ? "border border-cyan-400/25 bg-white/[0.07] text-white"
                        : "border border-transparent bg-transparent text-cyan-100/48 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <Icon className="h-3 w-3 opacity-90" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: lead overflow, notifications, customize, help, account */}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              <nav
                aria-label="Workspace mobile"
                className="flex max-w-[42vw] items-center gap-0.5 overflow-x-auto md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                        "route5-nav-row inline-flex h-6 shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold",
                        active
                          ? "border-cyan-400/25 bg-white/[0.07] text-white"
                          : "border-transparent text-cyan-100/48 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <Icon className="h-3 w-3 opacity-90" />
                    </Link>
                  );
                })}
              </nav>

              {canLead ? (
                <div className="relative" ref={leadWrapRef}>
                  <button
                    type="button"
                    onClick={() => setLeadOpen((o) => !o)}
                    className="route5-pressable inline-flex h-7 items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/28 px-2 text-[10px] font-semibold text-cyan-50/95 transition hover:border-cyan-400/28 hover:bg-white/[0.05] sm:px-2.5 sm:text-[11px]"
                    aria-expanded={leadOpen}
                    aria-haspopup="menu"
                  >
                    Actions
                    <ChevronDown className={classNames("h-3 w-3 opacity-80 transition", leadOpen && "rotate-180")} />
                  </button>
                  {leadOpen ? (
                    <div
                      className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] rounded-xl border border-white/[0.1] bg-[#0a1214]/96 py-1.5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.75)] backdrop-blur-md"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItem}
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
                        className={menuItem}
                        onClick={() => {
                          openRunAgent();
                          setLeadOpen(false);
                        }}
                      >
                        <Sparkles className="h-4 w-4 text-emerald-300/85" strokeWidth={2} />
                        Run Agent
                      </button>
                      <Link
                        href={agentHref}
                        role="menuitem"
                        className={menuItem}
                        onClick={() => setLeadOpen(false)}
                      >
                        <ListChecks className="h-4 w-4 text-cyan-200/80" strokeWidth={2} />
                        Action Queue
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItem}
                        onClick={() => {
                          openSendUpdate();
                          setLeadOpen(false);
                        }}
                      >
                        <Mail className="h-4 w-4 text-teal-200/80" strokeWidth={2} />
                        Send Update Request
                      </button>
                      <button type="button" role="menuitem" className={menuItem} onClick={() => goEmployeePreview()}>
                        <Eye className="h-4 w-4 text-white/70" strokeWidth={2} />
                        Employee Preview
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <WorkspaceNotificationsPopover />

              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="route5-pressable inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-black/22 text-cyan-100/58 transition hover:border-cyan-400/28 hover:bg-white/[0.05] hover:text-white"
                aria-label="Customize workspace"
                title="Customize"
              >
                <Palette className="h-3.5 w-3.5" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="route5-pressable inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-black/22 text-cyan-100/58 transition hover:border-cyan-400/28 hover:bg-white/[0.05] hover:text-white"
                aria-label="Help"
                title="Help"
              >
                <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>

              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-black/30">
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
