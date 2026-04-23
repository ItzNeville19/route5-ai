"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import OverviewTimeOfDayArt from "@/components/overview/OverviewTimeOfDayArt";

export type OverviewDayPeriod = "morning" | "afternoon" | "evening" | "night";

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
};

function borderForPeriod(period: OverviewDayPeriod): string {
  switch (period) {
    case "morning":
      return "border-amber-200/50 dark:border-amber-800/30";
    case "afternoon":
      return "border-sky-200/50 dark:border-sky-800/30";
    case "evening":
      return "border-violet-200/45 dark:border-violet-800/30";
    default:
      return "border-slate-300/50 dark:border-slate-700/40";
  }
}

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
      return "Overdue, due soon, and open work—plus your companies—in one calm screen.";
    case "afternoon":
      return "Same snapshot through the day: tasks, dates, and companies without digging through chat.";
    case "evening":
      return "See what still needs attention before you sign off.";
    default:
      return "Nothing urgent here—your list waits until you're back.";
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
}: Props) {
  const border = borderForPeriod(period);
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
      className={`relative min-h-[11rem] overflow-hidden rounded-[var(--r5-radius-lg)] border bg-r5-surface-primary/20 ${border} p-[var(--r5-space-5)] shadow-sm`}
    >
      <OverviewTimeOfDayArt period={period} />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-white/20 dark:from-slate-950/85 dark:via-slate-950/45 dark:to-slate-950/20"
        aria-hidden
      />

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-[var(--r5-space-3)]">
        <div className="max-w-[72ch] pr-4">
          <p className="text-[length:var(--r5-font-caption)] tracking-[0.04em] text-r5-text-secondary [text-shadow:0_1px_12px_rgba(255,255,255,0.85)] dark:[text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
            <span className="font-medium text-r5-text-primary/90">{dateLine}</span>
            <span className="mx-1.5 text-r5-text-secondary/80">·</span>
            <span>
              {timeLine}
              {zoneAbbrev ? <span className="text-r5-text-secondary/90"> {zoneAbbrev}</span> : null}
            </span>
            {placeLabel ? (
              <>
                <span className="mx-1.5 text-r5-text-secondary/80">·</span>
                <span className="text-r5-text-secondary">{placeLabel}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-[var(--r5-space-3)] text-[clamp(1.35rem,4vw,1.65rem)] font-semibold tracking-[-0.02em] text-r5-text-primary [text-shadow:0_1px_12px_rgba(255,255,255,0.9)] dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
            {greeting}
            {firstName ? (
              <>
                {", "}
                <span className="text-r5-text-primary">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-1 text-[15px] font-medium text-r5-text-primary/90 [text-shadow:0_1px_8px_rgba(255,255,255,0.85)] dark:[text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            {headlineForPeriod(period)}
          </p>
          <p className="mt-[var(--r5-space-2)] max-w-[56ch] text-[13px] leading-relaxed text-r5-text-secondary [text-shadow:0_1px_6px_rgba(255,255,255,0.75)] dark:[text-shadow:0_1px_6px_rgba(0,0,0,0.35)]">
            {leadForPeriod(period)}
          </p>
        </div>
        <div className="relative z-[1] flex flex-shrink-0 flex-wrap items-center gap-[var(--r5-space-2)]">
          {children}
        </div>
      </div>
    </motion.section>
  );
}
