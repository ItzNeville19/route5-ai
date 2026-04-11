"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  DASHBOARD_INSIGHTS,
  dismissInsight,
  filterInsightsForUser,
  loadDismissedInsightIds,
  type InsightContext,
  type ResolvedInsight,
} from "@/lib/dashboard-insights";
import { dateKeyInTimezone } from "@/lib/timezone-date";

type Props = {
  projectCount: number;
  extractionCount: number;
  liveConnectorCount: number | null;
  readiness: {
    openai: boolean;
    linear: boolean;
    github: boolean;
  } | null;
};

const SWIPE_DISMISS_PX = 96;

function InsightCarouselCard({
  insight,
  index,
  total,
  dateLabel,
  onDismiss,
  onNext,
  onPrev,
}: {
  insight: ResolvedInsight;
  index: number;
  total: number;
  dateLabel: string;
  onDismiss: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  /** Exit direction — avoids useAnimation + animate={controls}, which can leave opacity stuck at 0. */
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    setExitDir(null);
    dismissedRef.current = false;
  }, [insight.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={
        exitDir
          ? { opacity: 0, x: exitDir === "left" ? -280 : 280 }
          : { opacity: 1, y: 0, x: 0 }
      }
      exit={{ opacity: 0, y: 8 }}
      transition={{
        duration: exitDir ? 0.22 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={() => {
        if (!exitDir || dismissedRef.current) return;
        dismissedRef.current = true;
        onDismiss();
      }}
      className="relative min-h-[220px] overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-fg)] shadow-[0_24px_64px_-28px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/[0.12] dark:shadow-[0_28px_80px_-36px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(99,102,241,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[var(--workspace-accent)] via-violet-500 to-emerald-500/90" />
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_DISMISS_PX || info.velocity.x < -420) {
            setExitDir("left");
            return;
          }
          if (info.offset.x > SWIPE_DISMISS_PX || info.velocity.x > 420) {
            setExitDir("right");
            return;
          }
        }}
        style={{ touchAction: "none" }}
        className="relative cursor-grab active:cursor-grabbing"
      >
      <div className="flex gap-2 p-4 pl-5 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
              What&apos;s next
            </p>
            <span className="text-[var(--workspace-muted-fg)] opacity-60" aria-hidden>
              ·
            </span>
            <p className="text-[10px] font-medium tabular-nums text-[var(--workspace-muted-fg)]">{dateLabel}</p>
            <span className="rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--workspace-muted-fg)]">
              {index + 1} / {total}
            </span>
          </div>
          <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            {insight.title}
          </h3>
          <p className="mt-2 min-h-[3.25rem] text-[13px] leading-relaxed text-[var(--workspace-fg)]/80">
            {insight.bodyResolved}
          </p>
          {insight.href && insight.cta ? (
            <Link
              href={insight.href}
              className="mt-4 inline-flex items-center rounded-lg bg-[var(--workspace-fg)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
            >
              {insight.cta}
            </Link>
          ) : null}
          <p className="mt-3 text-[10px] leading-snug text-[var(--workspace-muted-fg)]">
            Swipe to dismiss · arrows to browse · order resets at midnight in your timezone
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExitDir("left");
            }}
            className="rounded-lg p-2 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]/80 hover:text-[var(--workspace-fg)]"
            aria-label="Dismiss this tip"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      </motion.div>
      {total > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--workspace-border)] px-3 py-2">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]/80 hover:text-[var(--workspace-fg)]"
            aria-label="Previous tip"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-[var(--workspace-accent)]" : "w-1.5 bg-[var(--workspace-border)]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]/80 hover:text-[var(--workspace-fg)]"
            aria-label="Next tip"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </motion.article>
  );
}

export default function DashboardInsightFeed({
  projectCount,
  extractionCount,
  liveConnectorCount,
  readiness,
}: Props) {
  const { user } = useUser();
  const userId = user?.id;
  const exp = useWorkspaceExperience();
  const tz = exp.prefs.workspaceTimezone;
  const dayKey = useMemo(() => dateKeyInTimezone(tz), [tz]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDismissed(loadDismissedInsightIds());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onReset = () => {
      setDismissed(loadDismissedInsightIds());
      setIndex(0);
    };
    window.addEventListener("route5:insights-dismiss-reset", onReset);
    return () => window.removeEventListener("route5:insights-dismiss-reset", onReset);
  }, []);

  const ctx: InsightContext = useMemo(
    () => ({
      projectCount,
      extractionCount,
      liveConnectorCount,
      readiness,
    }),
    [projectCount, extractionCount, liveConnectorCount, readiness]
  );

  const list = useMemo(() => {
    if (!hydrated) return [];
    return filterInsightsForUser(
      DASHBOARD_INSIGHTS,
      ctx,
      dismissed,
      userId,
      dayKey
    ).slice(0, 14);
  }, [ctx, dismissed, hydrated, userId, dayKey]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, list.length - 1)));
  }, [list.length]);

  useEffect(() => {
    if (exp.prefs.insightsAutoShow === false) return;
    setIndex(0);
  }, [dayKey, exp.prefs.insightsAutoShow]);

  const dateLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, {
        timeZone: tz || undefined,
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  }, [tz]);

  const handleDismiss = useCallback((id: string) => {
    dismissInsight(id);
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const current = list[index];

  const goNext = useCallback(() => {
    setIndex((i) => (list.length ? (i + 1) % list.length : 0));
  }, [list.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (list.length ? (i - 1 + list.length) % list.length : 0));
  }, [list.length]);

  if (!hydrated) {
    return (
      <section
        className="mt-6 rounded-2xl border border-[var(--workspace-border)]/90 bg-gradient-to-b from-[var(--workspace-canvas)]/50 to-[var(--workspace-surface)]/95 p-4 sm:p-5"
        aria-label="What’s next"
        aria-busy="true"
      >
        <div className="mb-3 px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
            For you
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-[var(--workspace-fg)]">What&apos;s next</p>
        </div>
        <div className="dashboard-pro-card h-44 animate-pulse rounded-2xl" />
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-[var(--workspace-border)]/90 bg-gradient-to-b from-[var(--workspace-canvas)]/50 to-[var(--workspace-surface)]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_0_rgba(0,0,0,0.2)] sm:p-5"
      aria-label="What’s next"
    >
      <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
            For you
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-[var(--workspace-fg)]">
            What&apos;s next
          </p>
          <p className="mt-1 max-w-md text-[12px] leading-snug text-[var(--workspace-muted-fg)]">
            Short nudges based on your workspace — the set reorders each day. Swipe the card or tap ✕ to dismiss.
          </p>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="dashboard-pro-card flex min-h-[200px] flex-col justify-center gap-2 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-[15px] font-semibold text-[var(--workspace-fg)]">You&apos;re caught up</p>
          <p className="text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Nothing queued — add a project, run an extraction, or connect a tool in Connections to unlock new suggestions.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Link
              href="/integrations"
              className="inline-flex rounded-lg bg-[var(--workspace-fg)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95"
            >
              Connections
            </Link>
            <Link
              href="/desk"
              className="inline-flex rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-surface)]"
            >
              Desk
            </Link>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {current ? (
            <InsightCarouselCard
              key={current.id}
              insight={current}
              index={index}
              total={list.length}
              dateLabel={dateLabel}
              onDismiss={() => handleDismiss(current.id)}
              onNext={goNext}
              onPrev={goPrev}
            />
          ) : null}
        </AnimatePresence>
      )}
    </section>
  );
}
