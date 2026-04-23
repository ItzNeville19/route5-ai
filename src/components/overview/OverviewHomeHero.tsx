"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

export type OverviewDayPeriod = "morning" | "afternoon" | "evening" | "night";

type Props = {
  period: OverviewDayPeriod;
  now: Date;
  firstName: string;
  children?: ReactNode;
};

function sceneForPeriod(period: OverviewDayPeriod): {
  gradient: string;
  border: string;
  waveClass: string;
  accent: string;
} {
  switch (period) {
    case "morning":
      return {
        gradient:
          "from-amber-200/95 via-orange-50/90 to-sky-50/85 dark:from-amber-950/40 dark:via-orange-950/25 dark:to-slate-950/80",
        border: "border-amber-200/60 dark:border-amber-800/40",
        waveClass: "text-sky-400/50 dark:text-cyan-900/60",
        accent: "text-amber-700 dark:text-amber-200/95",
      };
    case "afternoon":
      return {
        gradient:
          "from-sky-200/90 via-cyan-50/85 to-white dark:from-sky-950/35 dark:via-cyan-950/20 dark:to-slate-950/85",
        border: "border-sky-200/55 dark:border-sky-800/35",
        waveClass: "text-sky-400/45 dark:text-sky-900/55",
        accent: "text-sky-800 dark:text-sky-200/90",
      };
    case "evening":
      return {
        gradient:
          "from-violet-200/85 via-fuchsia-100/75 to-orange-50/80 dark:from-violet-950/45 dark:via-fuchsia-950/25 dark:to-slate-950/88",
        border: "border-violet-200/50 dark:border-violet-800/35",
        waveClass: "text-indigo-400/40 dark:text-indigo-900/55",
        accent: "text-violet-800 dark:text-violet-200/90",
      };
    default:
      return {
        gradient:
          "from-slate-300/80 via-indigo-100/70 to-slate-50 dark:from-slate-950/90 dark:via-indigo-950/40 dark:to-slate-950/95",
        border: "border-slate-200/60 dark:border-slate-700/45",
        waveClass: "text-indigo-500/35 dark:text-indigo-950/70",
        accent: "text-indigo-200 dark:text-indigo-100/90",
      };
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

function SunGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="22" fill="currentColor" opacity="0.95" />
      {[...Array(12)].map((_, i) => (
        <line
          key={i}
          x1="60"
          y1="14"
          x2="60"
          y2="26"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
          transform={`rotate(${i * 30} 60 60)`}
        />
      ))}
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden>
      <path
        fill="currentColor"
        d="M72 24c-24 4-40 26-36 50s22 40 46 40c6 0 12-1 17-3-14 10-32 12-48 4C28 103 18 77 24 52 30 27 52 10 77 10c6 0 12 1 17 3l-22 11z"
        opacity="0.92"
      />
      <circle cx="88" cy="38" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="96" cy="56" r="0.9" fill="currentColor" opacity="0.45" />
      <circle cx="82" cy="62" r="0.7" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function OceanWaves({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 56" preserveAspectRatio="none" aria-hidden>
      <path
        fill="currentColor"
        fillOpacity="0.35"
        d="M0,28 C200,12 400,44 600,28 C800,12 1000,44 1200,28 L1200,56 L0,56 Z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.5"
        d="M0,36 C240,46 480,22 720,38 C960,54 1080,30 1200,40 L1200,56 L0,56 Z"
      />
    </svg>
  );
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

export default function OverviewHomeHero({ period, now, firstName, children }: Props) {
  const scene = sceneForPeriod(period);
  const tzLabel = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat(undefined, { timeZoneName: "long" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value;
      if (tz) return tz;
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
    } catch {
      return "";
    }
  }, [now]);

  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLine = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const greeting = greetingForOverviewPeriod(period);
  const showSun = period !== "night";
  const sunLow = period === "evening";

  return (
    <section
      className={`relative overflow-hidden rounded-[var(--r5-radius-lg)] border bg-gradient-to-br ${scene.gradient} ${scene.border} p-[var(--r5-space-5)]`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.35]"
        aria-hidden
        style={{
          background:
            period === "night"
              ? "radial-gradient(ellipse 90% 80% at 80% 10%, rgba(99,102,241,0.25), transparent 55%)"
              : period === "evening"
                ? "radial-gradient(ellipse 100% 70% at 90% 0%, rgba(249,115,22,0.2), transparent 50%)"
                : "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(251,191,36,0.18), transparent 50%)",
        }}
      />

      <div
        className={`pointer-events-none absolute -right-4 -top-4 h-36 w-36 opacity-90 dark:opacity-[0.85] ${scene.accent}`}
        aria-hidden
      >
        {showSun ? (
          <SunGlyph
            className={`h-full w-full ${sunLow ? "translate-y-6 scale-90 opacity-90" : ""}`}
          />
        ) : (
          <MoonGlyph className="h-full w-full" />
        )}
      </div>

      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-14 text-[color:var(--r5-text-primary)] ${scene.waveClass}`}
        aria-hidden
      >
        <OceanWaves className="h-full w-full" />
      </div>

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-[var(--r5-space-3)]">
        <div className="max-w-[72ch] pr-4">
          <p className="text-[length:var(--r5-font-caption)] tracking-[0.04em] text-r5-text-secondary">
            <span className="font-medium text-r5-text-primary/90">{dateLine}</span>
            <span className="mx-1.5 text-r5-text-secondary/80">·</span>
            <span>{timeLine}</span>
            {tzLabel ? (
              <>
                <span className="mx-1.5 text-r5-text-secondary/80">·</span>
                <span className="text-r5-text-secondary">{tzLabel}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-[var(--r5-space-3)] text-[clamp(1.35rem,4vw,1.65rem)] font-semibold tracking-[-0.02em] text-r5-text-primary">
            {greeting}
            {firstName ? (
              <>
                {", "}
                <span className="text-r5-text-primary">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-1 text-[15px] font-medium text-r5-text-primary/90">{headlineForPeriod(period)}</p>
          <p className="mt-[var(--r5-space-2)] max-w-[56ch] text-[13px] leading-relaxed text-r5-text-secondary">
            {leadForPeriod(period)}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-[var(--r5-space-2)]">{children}</div>
      </div>
    </section>
  );
}
