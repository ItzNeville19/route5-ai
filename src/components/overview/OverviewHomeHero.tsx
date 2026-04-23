"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import OverviewTimeOfDayArt from "@/components/overview/OverviewTimeOfDayArt";

export type OverviewDayPeriod = "morning" | "afternoon" | "evening" | "night";

type CanvasMode = "gradient" | "photo";

type Props = {
  period: OverviewDayPeriod;
  now: Date;
  firstName: string;
  /** IANA zone from workspace prefs / region (not the browser default). */
  timeZone: string;
  placeLabel: string;
  /** BCP-47, e.g. en-US */
  locale?: string;
  children?: ReactNode;
  /** Matches workspace canvas: mesh vs photography. */
  canvasMode: CanvasMode;
  /** Rotates hero art (mesh variant or photo from pool). */
  heroWallIndex: number;
  /** Region key for curated photo pools (photo mode). */
  workspaceRegionKey?: string;
  /** Tap location line to cycle wall art. */
  onCycleHeroWall?: () => void;
};

function headlineForPeriod(period: OverviewDayPeriod): string {
  switch (period) {
    case "morning":
      return "Start clear";
    case "afternoon":
      return "Your day at a glance";
    case "evening":
      return "Finish strong";
    default:
      return "Rest well";
  }
}

function leadForPeriod(period: OverviewDayPeriod): string {
  switch (period) {
    case "morning":
      return "Overdue, due soon, and open work — plus your companies — in one calm screen.";
    case "afternoon":
      return "Tasks, dates, and programs stay visible here so nothing slips through the cracks.";
    case "evening":
      return "See what still needs attention before you sign off.";
    default:
      return "Nothing urgent here — your list waits until you're back.";
  }
}

export function greetingForOverviewPeriod(period: OverviewDayPeriod): string {
  switch (period) {
    case "morning":
      return "Good morning";
    case "afternoon":
      return "Good afternoon";
    case "evening":
      return "Good evening";
    default:
      return "Good night";
  }
}

export function dayPeriodForHour(hour: number): OverviewDayPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export default function OverviewHomeHero({
  period,
  now,
  firstName,
  timeZone,
  placeLabel,
  locale = "en-US",
  children,
  canvasMode,
  heroWallIndex,
  workspaceRegionKey,
  onCycleHeroWall,
}: Props) {
  const { dateLine, timeLine, zoneAbbrev } = useMemo(() => {
    try {
      const dateLineInner = now.toLocaleDateString(locale, {
        timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const timeLineInner = now.toLocaleTimeString(locale, {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
      });
      const z =
        Intl.DateTimeFormat(locale, {
          timeZone,
          timeZoneName: "short",
        })
          .formatToParts(now)
          .find((p) => p.type === "timeZoneName")?.value ?? "";
      return { dateLine: dateLineInner, timeLine: timeLineInner, zoneAbbrev: z };
    } catch {
      return { dateLine: "", timeLine: "", zoneAbbrev: "" };
    }
  }, [now, timeZone, locale]);

  const greeting = greetingForOverviewPeriod(period);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[12rem] overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.18)] dark:border-slate-700/90 dark:bg-slate-950/40 dark:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.55)]"
    >
      <OverviewTimeOfDayArt
        period={period}
        mode={canvasMode}
        rotationIndex={heroWallIndex}
        regionKey={workspaceRegionKey}
      />

      <div className="relative z-[1] flex flex-col gap-4 p-[var(--r5-space-5)] sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-[46rem] flex-1 rounded-xl border border-white/70 bg-white/93 px-5 py-4 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/92 dark:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.65)]">
          <p className="text-[length:var(--r5-font-caption)] tracking-[0.04em] text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-50">{dateLine}</span>
            <span className="mx-1.5 text-slate-400 dark:text-slate-500">·</span>
            <span className="text-slate-700 dark:text-slate-200">
              {timeLine}
              {zoneAbbrev ? <span className="text-slate-500 dark:text-slate-400"> {zoneAbbrev}</span> : null}
            </span>
            {placeLabel ? (
              <>
                <span className="mx-1.5 text-slate-400 dark:text-slate-500">·</span>
                {onCycleHeroWall ? (
                  <button
                    type="button"
                    onClick={onCycleHeroWall}
                    title="Change background look"
                    className="rounded-md font-medium text-[#5059c9] underline decoration-[#5059c9]/35 decoration-dotted underline-offset-2 transition hover:bg-[#5059c9]/10 hover:decoration-[#5059c9] dark:text-[#a5b4fc] dark:decoration-[#a5b4fc]/40 dark:hover:bg-indigo-500/15"
                  >
                    {placeLabel}
                  </button>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400">{placeLabel}</span>
                )}
              </>
            ) : null}
          </p>
          <h1 className="mt-[var(--r5-space-3)] text-[clamp(1.35rem,4vw,1.75rem)] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            {greeting}
            {firstName ? (
              <>
                {", "}
                <span className="text-slate-950 dark:text-white">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
            {headlineForPeriod(period)}
          </p>
          <p className="mt-[var(--r5-space-2)] max-w-[56ch] text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {leadForPeriod(period)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/65 bg-white/82 px-3 py-3 shadow-sm backdrop-blur-md dark:border-white/12 dark:bg-slate-950/78 sm:justify-end">
          {children}
        </div>
      </div>
    </motion.section>
  );
}
