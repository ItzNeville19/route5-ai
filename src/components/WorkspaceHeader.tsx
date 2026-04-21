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
import WorkspaceHeaderGreeting from "@/components/app/WorkspaceHeaderGreeting";

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

      {pathname === "/desk" ? (
        <div className="relative overflow-hidden border-t border-cyan-400/15 bg-gradient-to-r from-[#071018] via-[#0a1a24] to-[#14120e]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 20% 0%, rgba(34, 211, 238, 0.09), transparent 50%), radial-gradient(ellipse 70% 60% at 85% 100%, rgba(251, 191, 36, 0.06), transparent 55%)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] opacity-50"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(125, 211, 252, 0.25) 25%, rgba(254, 243, 199, 0.12) 50%, rgba(125, 211, 252, 0.2) 75%, transparent 100%)",
            }}
          />
          <div className="relative mx-auto max-w-[min(100%,1440px)] px-[var(--r5-content-padding-x-mobile)] py-2.5 sm:px-[var(--r5-content-padding-x)] sm:py-3">
            <WorkspaceHeaderGreeting variant="desk-bar" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
