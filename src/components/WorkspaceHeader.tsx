"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Plus, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import WorkspaceChatPanel from "@/components/chat/WorkspaceChatPanel";
import WorkspaceProjectSwitcher from "@/components/workspace/WorkspaceProjectSwitcher";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useCapture } from "@/components/capture/CaptureProvider";
import { getWorkspacePageTitle } from "@/lib/workspace-page-title";
import { Route5WordmarkInline } from "@/components/brand/Route5BrandMark";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";

export default function WorkspaceHeader({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
  const pathname = usePathname() ?? "";
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  useWorkspaceData();
  const { open: openCapture } = useCapture();

  const sidebarHidden = exp.prefs.sidebarHidden === true;
  const pageTitle = getWorkspacePageTitle(pathname);

  return (
    <header className="agent-header agent-header-liquid sticky top-0 z-30 border-b border-r5-border-subtle">
      <div className="mx-auto flex min-h-[var(--r5-header-height)] max-w-[min(100%,1440px)] items-center justify-between gap-[var(--r5-space-2)] px-[var(--r5-content-padding-x-mobile)] py-1.5 sm:px-[var(--r5-content-padding-x)]">
        <div className="flex min-w-0 flex-1 items-center gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => {
              if (onSidebarToggle) {
                onSidebarToggle();
                return;
              }
              exp.setPrefs({ sidebarHidden: !sidebarHidden });
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 text-r5-text-secondary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,transform] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary"
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
          <Link
            href="/desk"
            className="mr-1 inline-flex shrink-0"
            title="Route5 — Desk"
            aria-label="Route5 home"
          >
            <Route5WordmarkInline className="text-[13px]" />
          </Link>
          <Suspense
            fallback={
              <div
                className="hidden h-8 w-[min(100%,140px)] animate-pulse rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/60 md:block"
                aria-hidden
              />
            }
          >
            <WorkspaceProjectSwitcher />
          </Suspense>
          <h1 className="min-w-0 flex-1 truncate text-[14px] font-[var(--r5-font-weight-semibold)] leading-tight tracking-[-0.01em] text-r5-text-primary max-sm:max-w-[min(100%,120px)] sm:max-w-[min(100%,320px)]">
            {pageTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => openPalette()}
            className="inline-flex h-8 items-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 px-2.5 text-[12px] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover"
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
          <WorkspaceChatPanel />

          <button
            type="button"
            onClick={() => openCapture()}
            className="group inline-flex h-8 items-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary px-2.5 text-[12px] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover"
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

          <div className="pl-1">
            <UserButton
              appearance={{
                ...route5ClerkAppearance,
                elements: {
                  ...route5ClerkAppearance.elements,
                  avatarBox: "h-8 w-8 ring-2 ring-white/10",
                  userButtonPopoverCard:
                    "border border-white/10 bg-[#0a0a0a] text-[#fafafa] shadow-2xl",
                },
              }}
            />
          </div>
        </div>
      </div>

    </header>
  );
}
