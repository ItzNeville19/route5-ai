"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Plus, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useCapture } from "@/components/capture/CaptureProvider";
import { getWorkspacePageTitle } from "@/lib/workspace-page-title";
import WorkspaceHeaderGreeting from "@/components/app/WorkspaceHeaderGreeting";
import { Route5WordmarkInline } from "@/components/brand/Route5BrandMark";

export default function WorkspaceHeader() {
  const pathname = usePathname() ?? "";
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  const { getProjectById } = useWorkspaceData();
  const { open: openCapture } = useCapture();

  const projectIdFromPath = pathname.match(/^\/projects\/([^/]+)$/)?.[1] ?? null;
  const projectTitle = projectIdFromPath ? getProjectById(projectIdFromPath)?.name ?? null : null;

  const sidebarHidden = exp.prefs.sidebarHidden === true;
  const pageTitle = getWorkspacePageTitle(pathname);

  return (
    <header className="agent-header agent-header-liquid sticky top-0 z-30 border-b border-r5-border-subtle">
      <div className="mx-auto flex min-h-[var(--r5-header-height)] max-w-[min(100%,1440px)] flex-col gap-2 px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-2)] sm:px-[var(--r5-content-padding-x)] lg:flex-row lg:items-center lg:justify-between lg:gap-[var(--r5-space-4)]">
        <div className="flex min-w-0 flex-1 items-center gap-[var(--r5-space-2)] lg:max-w-[min(100%,420px)]">
          <button
            type="button"
            onClick={() => exp.setPrefs({ sidebarHidden: !sidebarHidden })}
            className="hidden shrink-0 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 p-[var(--r5-space-2)] text-r5-text-secondary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,transform] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary md:inline-flex md:items-center md:justify-center"
            title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
            aria-pressed={!sidebarHidden}
            aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
          >
            <PanelLeft
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)]"
              strokeWidth={2}
              aria-hidden
            />
          </button>
          {sidebarHidden ? (
            <Link
              href="/feed"
              className="mr-1 inline-flex shrink-0"
              title="Route5 — Feed"
              aria-label="Route5 home"
            >
              <Route5WordmarkInline className="text-[length:var(--r5-font-subheading)]" />
            </Link>
          ) : null}
          <h1 className="min-w-0 truncate text-[length:var(--r5-font-heading)] font-[var(--r5-font-weight-semibold)] leading-[var(--r5-leading-heading)] tracking-[-0.03em] text-r5-text-primary">
            {pageTitle}
          </h1>
        </div>

        <div className="hidden min-w-0 flex-[1.1] justify-center px-[var(--r5-space-2)] lg:flex">
          <WorkspaceHeaderGreeting />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => openPalette()}
            className="inline-flex items-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 px-[var(--r5-space-3)] py-[var(--r5-space-2)] text-[length:var(--r5-font-body)] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover"
            aria-label="Search"
          >
            <Search
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)] text-r5-text-secondary"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-secondary xl:inline">
              ⌘K
            </kbd>
          </button>

          <WorkspaceNotificationsPopover />

          <button
            type="button"
            onClick={() => openCapture()}
            className="group inline-flex items-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-button)] border border-r5-border-subtle bg-r5-surface-secondary px-[var(--r5-space-3)] py-[var(--r5-space-2)] text-[length:var(--r5-font-body)] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover"
            aria-label="Open Capture"
          >
            <Plus
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden sm:inline">Capture</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-tertiary group-hover:inline sm:group-hover:inline">
              ⌘J
            </kbd>
          </button>

          <div className="pl-[var(--r5-space-1)]">
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

      {projectIdFromPath && projectTitle ? (
        <div className="border-t border-r5-border-subtle bg-r5-surface-primary/40 px-[var(--r5-content-padding-x-mobile)] py-[var(--r5-space-3)] text-[length:var(--r5-font-body)] text-r5-text-secondary sm:px-[var(--r5-content-padding-x)]">
          <Link
            href="/feed"
            className="font-[var(--r5-font-weight-medium)] text-r5-text-primary transition-colors duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:text-r5-text-primary"
          >
            Feed
          </Link>
          <span className="mx-[var(--r5-space-2)] text-r5-text-tertiary" aria-hidden>
            /
          </span>
          <span className="font-[var(--r5-font-weight-semibold)] text-r5-text-primary">{projectTitle}</span>
        </div>
      ) : null}
    </header>
  );
}
