"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import type { RecentExtractionRow } from "@/lib/workspace-summary";
import {
  getTodayCardsForWorkspace,
  type TodayCardDef,
  type WorkspaceInsightContext,
} from "@/lib/workspace-welcome";

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(userId: string): string {
  return `route5:todayCardsDismissed:${userId}:${dayKey()}`;
}

function openNewProjectModal() {
  window.dispatchEvent(new Event("route5:new-project-open"));
}

function openAssistant() {
  window.dispatchEvent(new Event("route5:assistant-open"));
}

type Props = {
  projectCount: number;
  extractionCount: number;
  readiness: WorkspaceInsightContext["readiness"];
  /** IANA zone — defaults to the browser’s `Intl` zone when prefs unset. */
  workspaceTimezone?: string;
  /** Region label key — pairs with timezone for “Local time … · Laguna Beach”. */
  workspaceRegionKey?: string;
  /** OS/browser locale for clock strings (e.g. 24h in EU). */
  locale?: string;
  /** Latest run for deep-linked suggestions (duplicate / continue). */
  latestExtraction?: Pick<
    RecentExtractionRow,
    "id" | "projectId" | "projectName" | "summarySnippet"
  > | null;
  /** Matches centered Overview hero; default is left-aligned. */
  layout?: "default" | "hero";
  /** Renders with light text / frosted cards on the dark glass hero (Overview). */
  surface?: "default" | "darkHero";
};

/** Dismissible suggestion cards only — metrics live in `DashboardWorkspaceHero`. */
export default function DashboardTodayPanel({
  projectCount,
  extractionCount,
  readiness,
  workspaceTimezone,
  workspaceRegionKey,
  locale = "en-US",
  latestExtraction = null,
  layout = "default",
  surface = "default",
}: Props) {
  const { user } = useUser();
  const userId = user?.id;

  const ctx = useMemo<WorkspaceInsightContext>(
    () => ({
      projectCount,
      extractionCount,
      readiness,
      latestExtraction: latestExtraction ?? undefined,
    }),
    [projectCount, extractionCount, readiness, latestExtraction]
  );

  const allCards = useMemo(
    () => getTodayCardsForWorkspace(ctx, userId, workspaceTimezone, workspaceRegionKey, locale),
    [ctx, userId, workspaceTimezone, workspaceRegionKey, locale]
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setDismissed(new Set(parsed.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [userId]);

  const persistDismiss = useCallback(
    (id: string) => {
      if (!userId) return;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(storageKey(userId), JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [userId]
  );

  const visibleCards = useMemo(
    () => allCards.filter((c) => !dismissed.has(c.id)).slice(0, 4),
    [allCards, dismissed]
  );
  const dismissedAllForToday = allCards.length > 0 && visibleCards.length === 0;

  const dismissAll = useCallback(() => {
    if (!userId) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      visibleCards.forEach((c) => next.add(c.id));
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [userId, visibleCards]);

  const restoreAll = useCallback(() => {
    if (!userId) return;
    setDismissed(new Set());
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const handleCta = (card: TodayCardDef) => {
    if (card.ctaHref === "#new-project") {
      openNewProjectModal();
    }
    if (card.ctaHref === "#assistant") {
      openAssistant();
    }
  };

  if (!hydrated) {
    return null;
  }

  if (dismissedAllForToday) {
    return (
      <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/55 px-4 py-3">
        <p className="text-[12px] text-[var(--workspace-muted-fg)]">
          Today cards were dismissed for now.
        </p>
        <button
          type="button"
          onClick={restoreAll}
          className="mt-2 text-[12px] font-semibold text-[var(--workspace-accent)] underline-offset-2 hover:underline"
        >
          Show today cards again
        </button>
      </div>
    );
  }

  if (visibleCards.length === 0) {
    return null;
  }

  const isHero = layout === "hero";
  const dark = surface === "darkHero";

  const headingClass = dark
    ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78"
    : "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]";
  const subClass = dark
    ? "mt-0.5 text-[12px] text-white/72"
    : "mt-0.5 text-[12px] text-[var(--workspace-muted-fg)]";
  const clearClass = dark
    ? "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
    : "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]";
  const dismissBtnClass = dark
    ? "absolute right-2 top-2 rounded-md p-1 text-white/75 transition hover:bg-white/10 hover:text-white"
    : "absolute right-2 top-2 rounded-md p-1 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]";
  const titleClass = dark ? "pr-6 text-[12px] font-semibold leading-snug text-white" : "pr-6 text-[12px] font-semibold leading-snug text-[var(--workspace-fg)]";
  const bodyClass = dark
    ? "mt-1 flex-1 text-[11px] leading-relaxed text-white/80"
    : "mt-1 flex-1 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]";
  const ctaPrimary = dark
    ? "text-[11px] font-semibold text-violet-200 hover:text-white hover:underline"
    : "text-[11px] font-semibold text-[var(--workspace-accent)] hover:underline";
  const ctaMuted = dark
    ? "text-[11px] font-medium text-white/72 underline-offset-2 hover:text-white hover:underline"
    : "text-[11px] font-medium text-[var(--workspace-muted-fg)] underline-offset-2 hover:text-[var(--workspace-fg)] hover:underline";

  const cardShell = (variant: TodayCardDef["variant"]) =>
    dark
      ? variant === "accent"
        ? "relative flex min-h-[120px] flex-col rounded-2xl border border-violet-400/35 bg-violet-500/10 px-3.5 py-3 shadow-[0_0_0_1px_rgba(139,92,246,0.12)] backdrop-blur-md transition-shadow duration-300"
        : "relative flex min-h-[120px] flex-col rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-shadow duration-300"
      : variant === "accent"
        ? "relative flex min-h-[120px] flex-col rounded-2xl border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/[0.08] px-3.5 py-3 transition-shadow duration-300 workspace-depth-slab"
        : "workspace-liquid-glass liquid-glass-shimmer workspace-depth-slab relative flex min-h-[120px] flex-col rounded-2xl border border-[var(--workspace-border)] px-3.5 py-3 transition-shadow duration-300";

  return (
    <div className="space-y-3">
      <div
        className={
          isHero
            ? "flex flex-col items-center gap-2 text-center"
            : "flex items-end justify-between gap-3"
        }
      >
        <div className={isHero ? "max-w-md" : undefined}>
          <h2 className={headingClass}>For you today</h2>
          <p className={subClass}>
            Personal picks from your workspace — dismiss any card; new ideas tomorrow.
          </p>
        </div>
        {visibleCards.length > 1 ? (
          <button type="button" onClick={dismissAll} className={clearClass}>
            Clear all
          </button>
        ) : null}
      </div>

      <div
        className={`grid gap-2 sm:grid-cols-2 ${dark ? "lg:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-4"} ${isHero ? "sm:justify-items-stretch" : ""}`}
      >
        {visibleCards.map((card) => (
          <article key={card.id} className={cardShell(card.variant)}>
            <button
              type="button"
              onClick={() => persistDismiss(card.id)}
              className={dismissBtnClass}
              aria-label={`Dismiss: ${card.title}`}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <p className={titleClass}>{card.title}</p>
            <p className={bodyClass}>{card.body}</p>
            {card.ctaLabel && card.ctaHref ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {card.ctaHref === "#new-project" || card.ctaHref === "#assistant" ? (
                  <button type="button" onClick={() => handleCta(card)} className={ctaPrimary}>
                    {card.ctaLabel}
                  </button>
                ) : (
                  <Link href={card.ctaHref} className={ctaPrimary}>
                    {card.ctaLabel}
                  </Link>
                )}
                {card.learnMoreHref ? (
                  card.learnMoreHref === "#notifications" ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(new Event("route5:notifications-open"))
                      }
                      className={ctaMuted}
                    >
                      {card.learnMoreLabel ?? "Learn more"}
                    </button>
                  ) : (
                    <Link href={card.learnMoreHref} className={ctaMuted}>
                      {card.learnMoreLabel ?? "Learn more"}
                    </Link>
                  )
                ) : null}
              </div>
            ) : card.learnMoreHref ? (
              <div className="mt-2">
                {card.learnMoreHref === "#notifications" ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new Event("route5:notifications-open"))
                    }
                    className={ctaPrimary}
                  >
                    {card.learnMoreLabel ?? "Learn more"}
                  </button>
                ) : (
                  <Link href={card.learnMoreHref} className={ctaPrimary}>
                    {card.learnMoreLabel ?? "Learn more"}
                  </Link>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
