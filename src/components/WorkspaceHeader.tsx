"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Plus, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import WorkspaceNotificationsPopover from "@/components/workspace/WorkspaceNotificationsPopover";
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
    <header className="agent-header agent-header-liquid sticky top-0 z-30 border-b border-r5-border-subtle/90">
      <div className="mx-auto flex min-h-[var(--r5-header-height)] max-w-[min(100%,1440px)] items-center justify-between gap-1 px-[var(--r5-content-padding-x-mobile)] sm:gap-1.5 sm:px-[var(--r5-content-padding-x)]">
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (onSidebarToggle) {
                onSidebarToggle();
                return;
              }
              exp.setPrefs({ sidebarHidden: !sidebarHidden });
            }}
            className="route5-pressable inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center self-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/90 text-r5-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(2,6,23,0.35)] transition-[background-color,color,transform,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary"
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
            className="mr-0 inline-flex shrink-0 self-center opacity-95"
            title="Route5 — Desk"
            aria-label="Route5 home"
          >
            <Route5WordmarkInline className="text-[12px]" />
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
          <div className="min-w-0 flex-1 self-center">
            <h1
              className="text-left text-[14px] font-[var(--r5-font-weight-semibold)] leading-tight tracking-[-0.01em] text-r5-text-primary"
              title={pageTitle}
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex min-h-7 shrink-0 items-center justify-end gap-1 self-center">
          <button
            type="button"
            onClick={() => openPalette()}
            className="route5-pressable inline-flex h-[26px] w-[26px] items-center justify-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/90 px-2 text-[12px] font-[var(--r5-font-weight-medium)] text-r5-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(2,6,23,0.35)] transition-[background-color,color,transform,box-shadow] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover md:w-auto md:justify-start"
            aria-label="Search"
          >
            <Search
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)] text-r5-text-secondary"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-secondary 2xl:inline">
              {modLabel}K
            </kbd>
          </button>

          <WorkspaceNotificationsPopover />

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("route5:new-project-open", { detail: { mode: "task" } })
              )
            }
            className="route5-pressable group inline-flex h-[26px] w-[26px] items-center justify-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/90 px-2 text-[12px] font-[var(--r5-font-weight-medium)] text-r5-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(2,6,23,0.35)] transition-[background-color,color,box-shadow,transform] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover md:w-auto md:justify-start"
            aria-label={t("header.create.openTask")}
          >
            <Plus
              className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="hidden 2xl:inline">{t("header.create.addTask")}</span>
            <kbd className="hidden rounded-[var(--r5-radius-badge)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-2)] py-0.5 font-mono text-[10px] text-r5-text-tertiary group-hover:inline xl:group-hover:inline">
              {modLabel}N
            </kbd>
          </button>

          <div className="pl-0.5">
            <UserButton
              appearance={{
                ...route5ClerkAppearance,
                elements: {
                  ...route5ClerkAppearance.elements,
                  avatarBox: "h-7 w-7 ring-1 ring-white/15",
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
