"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

const NAV: readonly {
  href: string;
  label: string;
  match: (p: string) => boolean;
}[] = [
  { href: "/desk", label: "Desk", match: (p) => p === "/desk" },
  {
    href: "/projects",
    label: "Overview",
    match: (p) => p === "/projects" || p.startsWith("/projects/"),
  },
  { href: "/reports", label: "Reports", match: (p) => p === "/reports" },
  {
    href: "/team-insights",
    label: "Team",
    match: (p) => p === "/team-insights",
  },
  {
    href: "/integrations",
    label: "Integrations",
    match: (p) => p === "/integrations" || p.startsWith("/integrations/"),
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    match: (p) => p === "/marketplace" || p.startsWith("/marketplace/"),
  },
];

function NavPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition sm:px-4 ${
        active
          ? "bg-white text-zinc-950 shadow-sm shadow-black/20"
          : "bg-white/[0.06] text-[var(--workspace-muted-fg)] hover:bg-white/[0.1] hover:text-[var(--workspace-fg)]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function WorkspaceHeader() {
  const pathname = usePathname() ?? "";
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  const { getProjectById } = useWorkspaceData();

  const projectIdFromPath = pathname.match(/^\/projects\/([^/]+)$/)?.[1] ?? null;
  const projectTitle = projectIdFromPath ? getProjectById(projectIdFromPath)?.name ?? null : null;

  const sidebarHidden = exp.prefs.sidebarHidden === true;

  return (
    <header className="agent-header agent-header-liquid sticky top-0 z-30 border-b border-[var(--workspace-border)]">
      <div className="mx-auto flex min-h-[52px] max-w-[min(100%,1440px)] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => exp.setPrefs({ sidebarHidden: !sidebarHidden })}
          className="shrink-0 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-2 text-[var(--workspace-muted-fg)] shadow-sm transition hover:bg-white/[0.08] hover:text-[var(--workspace-fg)] md:inline-flex md:items-center md:justify-center"
          title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
          aria-pressed={!sidebarHidden}
          aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>

        <Link
          href="/projects"
          className="workspace-brand-wordmark shrink-0 py-1 text-[var(--workspace-fg)] transition hover:opacity-90"
        >
          Route 5
        </Link>

        <nav
          className="hidden min-w-0 flex-1 justify-center gap-1 overflow-x-auto pb-0.5 md:flex md:px-2"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <NavPill
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.match(pathname)}
            />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => openPalette()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-2.5 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:bg-white/[0.1] sm:px-3 sm:text-[13px]"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5 text-[var(--workspace-muted-fg)]" strokeWidth={2} aria-hidden />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden rounded-md border border-[var(--workspace-border)] bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--workspace-muted-fg)] xl:inline">
              ⌘K
            </kbd>
          </button>
          <WorkspaceNotificationsPopover />
          <div className="pl-0.5">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 ring-2 ring-white/10",
                  userButtonPopoverCard: "border border-white/10 bg-zinc-950/95 shadow-2xl",
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--workspace-border)]/80 px-3 pb-2.5 pt-0 md:hidden">
        <nav
          className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary mobile"
        >
          {NAV.map((item) => (
            <NavPill
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.match(pathname)}
            />
          ))}
        </nav>
      </div>

      {projectIdFromPath && projectTitle ? (
        <div className="border-t border-[var(--workspace-border)]/80 bg-black/25 px-4 py-2.5 text-[13px] text-[var(--workspace-muted-fg)] sm:px-8">
          <Link href="/projects" className="font-medium transition hover:text-[var(--workspace-fg)]">
            Overview
          </Link>
          <span className="mx-2 text-[var(--workspace-muted-fg)]/70" aria-hidden>
            /
          </span>
          <span className="font-semibold text-[var(--workspace-fg)]">{projectTitle}</span>
        </div>
      ) : null}
    </header>
  );
}
