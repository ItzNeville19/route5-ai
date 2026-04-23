"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Plus, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
import WorkspaceCommitmentsHeaderPanel from "@/components/workspace/WorkspaceCommitmentsHeaderPanel";
import WorkspaceProjectSwitcher from "@/components/workspace/WorkspaceProjectSwitcher";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { getWorkspacePageTitle } from "@/lib/workspace-page-title";
import { Route5WordmarkInline } from "@/components/brand/Route5BrandMark";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { primaryModLabelFromNavigator } from "@/lib/platform-shortcuts";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function WorkspaceHeader({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();
  useWorkspaceData();

  const sidebarHidden = exp.prefs.sidebarHidden === true;
  const pageTitle = getWorkspacePageTitle(pathname);
  const modLabel = primaryModLabelFromNavigator();

  return (
    <header className="agent-header agent-header-liquid sticky top-0 z-30 border-b border-r5-border-subtle">
      <div className="mx-auto flex min-h-[var(--r5-header-height)] max-w-[min(100%,1440px)] items-center justify-between gap-2 px-[var(--r5-content-padding-x-mobile)] sm:gap-[var(--r5-space-2)] sm:px-[var(--r5-content-padding-x)]">
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => {
              if (onSidebarToggle) {
                onSidebarToggle();
                return;
              }
              exp.setPrefs({ sidebarHidden: !sidebarHidden });
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 text-r5-text-secondary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,transform] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary"
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
            className="mr-0.5 inline-flex shrink-0 self-center"
            title="Route5 — Desk"
            aria-label="Route5 home"
          >
            <Route5WordmarkInline className="text-[13px]" />
          </Link>
          <Suspense
            fallback={
              <div
                className="h-8 w-[min(32vw,120px)] shrink-0 animate-pulse self-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/60 sm:w-[min(200px,28vw)]"
                aria-hidden
              />
            }
          >
            <div className="min-w-0 max-w-[min(46vw,13rem)] shrink-0 self-center sm:max-w-[min(44vw,17rem)] md:max-w-[22rem]">
              <WorkspaceProjectSwitcher />
            </div>
          </Suspense>
          <h1 className="min-w-0 flex-1 truncate self-center text-left text-[14px] font-[var(--r5-font-weight-semibold)] leading-tight tracking-[-0.01em] text-r5-text-primary">
            {pageTitle}
          </h1>
        </div>

        <div className="flex min-h-8 shrink-0 items-center justify-end gap-2 self-center sm:gap-[var(--r5-space-2)]">
          <button
            type="button"
            onClick={() => openPalette()}
            className="inline-flex h-8 w-8 items-center justify-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 px-2.5 text-[12px] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover sm:w-auto sm:justify-start"
            aria-label="Search"
          >
            <Search
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)] text-r5-text-secondary"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-secondary xl:inline">
              {modLabel}K
            </kbd>
          </button>

          <WorkspaceNotificationsPopover />
          <WorkspaceCommitmentsHeaderPanel />

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("route5:new-project-open", { detail: { mode: "task" } })
              )
            }
            className="group inline-flex h-8 w-8 items-center justify-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary px-2.5 text-[12px] font-[var(--r5-font-weight-regular)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover sm:w-auto sm:justify-start"
            aria-label={t("header.create.openTask")}
          >
            <Plus
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden sm:inline">{t("header.create.addTask")}</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-tertiary group-hover:inline sm:group-hover:inline">
              {modLabel}N
            </kbd>
          </button>

          <div className="pl-0 sm:pl-1">
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
      <div className="route5-brand-header-accent pointer-events-none" aria-hidden />
    </header>
  );
}
