"use client";

import { useMemo } from "react";
import { Caveat } from "next/font/google";
import OverviewTimeOfDayArt from "@/components/overview/OverviewTimeOfDayArt";
import {
  dayPeriodForHour,
  greetingForOverviewPeriod,
  type OverviewDayPeriod,
} from "@/components/overview/OverviewHomeHero";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import type { OverviewHeroPeriod } from "@/lib/workspace-theme-photos";
import { getDisplayLocationLabel, getWorkspaceIanaTimeZone } from "@/lib/workspace-regions";

const heroScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export type HeroOperationalCounts = {
  overdue: number;
  atRisk: number;
  blockers: number;
  approvals: number;
  pendingSends: number;
};

type Props = {
  prefs: WorkspacePrefsV1;
  now: Date;
  locale?: string;
  firstName: string;
  roleLabel: string;
  summaryLine: string;
  counts: HeroOperationalCounts;
  avatarUrls: Array<string | null | undefined>;
  /** Tighter hero for command-center density — stacks better with modules below. */
  compact?: boolean;
};

function toHeroPeriod(day: OverviewDayPeriod): OverviewHeroPeriod {
  return day === "morning" || day === "afternoon" || day === "evening" ? day : "night";
}

function dayOfYear(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

const SOFT_PERIOD: Record<OverviewHeroPeriod, string> = {
  morning: "from-slate-900/95 via-slate-800/85 to-cyan-950/65",
  afternoon: "from-slate-900 via-slate-800/88 to-sky-950/72",
  evening: "from-slate-950 via-indigo-950/82 to-slate-900",
  night: "from-slate-950 via-slate-900 to-black",
};

function SoftGradientBackdrop({ period }: { period: OverviewHeroPeriod }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${SOFT_PERIOD[period]}`}
      aria-hidden
    />
  );
}

export default function WelcomeHeroCard({
  prefs,
  now,
  locale = "en-US",
  firstName,
  roleLabel,
  summaryLine,
  counts,
  avatarUrls,
  compact,
}: Props) {
  const tz = getWorkspaceIanaTimeZone(prefs.workspaceTimezone, prefs.workspaceRegionKey);
  const hour = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).formatToParts(now);
      const h = parts.find((p) => p.type === "hour")?.value;
      return h ? Number.parseInt(h, 10) : now.getHours();
    } catch {
      return now.getHours();
    }
  }, [now, tz, locale]);

  const periodDay = dayPeriodForHour(hour);
  const periodHero = toHeroPeriod(periodDay);
  const greeting = greetingForOverviewPeriod(periodDay);

  const rotationIndex = useMemo(() => {
    const palette = prefs.welcomeHeroPalette ?? 0;
    const dov = dayOfYear(now);
    return (palette + dov) % 8;
  }, [prefs.welcomeHeroPalette, now]);

  const styleKind = prefs.welcomeHeroStyle ?? "atmospheric";
  const canvasBg = prefs.workspaceCanvasBackground ?? "gradient";

  const placeLabel =
    prefs.heroLocationOverride?.trim() ||
    getDisplayLocationLabel(prefs.workspaceTimezone, prefs.workspaceRegionKey) ||
    tz;

  const { timeStr } = useMemo(() => {
    try {
      const timeLineInner = now.toLocaleTimeString(locale, {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
      });
      return { timeStr: timeLineInner };
    } catch {
      return { timeStr: now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) };
    }
  }, [now, tz, locale]);

  const densityClass =
    compact || prefs.commandCenterDensity === "compact"
      ? compact
        ? "px-4 py-4 md:px-5 md:py-4"
        : "px-5 py-5 md:px-6 md:py-5"
      : "px-5 py-5 md:px-8 md:py-6";

  const accentRing =
    prefs.accentIntensity === "strong"
      ? "shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_24px_70px_-44px_rgba(8,145,178,0.35)]"
      : prefs.accentIntensity === "subtle"
        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.055)]"
        : "shadow-[0_0_0_1px_rgba(103,232,249,0.14),0_20px_64px_-48px_rgba(14,116,144,0.22)]";

  const headlineSize = compact
    ? "text-[clamp(1.02rem,2.4vw,1.28rem)]"
    : "text-[clamp(1.12rem,2.6vw,1.48rem)]";

  return (
    <section
      className={`route5-welcome-hero-shell relative overflow-hidden ${compact ? "rounded-[20px] md:rounded-[22px]" : "rounded-[24px] md:rounded-[26px]"} ${accentRing} ${densityClass} transition-[box-shadow,transform] duration-500 ease-out animate-[route5-page-enter_0.55s_ease-out_both]`}
    >
      {styleKind === "atmospheric" && canvasBg === "photo" ? (
        <>
          <OverviewTimeOfDayArt
            period={periodHero}
            mode="photo"
            rotationIndex={rotationIndex}
            regionKey={prefs.workspaceRegionKey}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15"
            aria-hidden
          />
        </>
      ) : styleKind === "minimal" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/94 to-slate-950"
          aria-hidden
        />
      ) : (
        <SoftGradientBackdrop period={periodHero} />
      )}

      {styleKind === "glass" ? (
        <div className="pointer-events-none absolute inset-0 bg-white/[0.04] backdrop-blur-[2px]" aria-hidden />
      ) : null}

      <div className="relative z-[1] text-center">
        <div className="relative mx-auto max-w-[640px] space-y-0">
          <p
            className={`${heroScript.className} ${headlineSize} leading-[1.1] tracking-[0.012em] text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.38)]`}
          >
            {greeting}, {firstName}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] font-medium tracking-[0.04em] text-white/[0.78] md:mt-2 md:text-[12px]">
            <span className="tabular-nums text-white/[0.9]">{timeStr}</span>
            <span className="h-1 w-px shrink-0 bg-white/28" aria-hidden />
            <span className="max-w-[min(100%,16rem)] text-center leading-snug text-white/[0.9]">{placeLabel}</span>
          </p>
          <p className="mt-2 inline-flex items-center rounded-full border border-white/14 bg-black/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/75">
            {roleLabel}
          </p>
          <div className="mt-3 flex justify-center gap-[-8px]">
            {avatarUrls.slice(0, 8).map((url, i) => (
              <span
                key={i}
                className="-ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#152028] text-[10px] font-semibold text-white/90 first:ml-0"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="opacity-70">?</span>
                )}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-[520px] text-[12px] leading-relaxed text-white/[0.72] md:text-[13px]">
            {summaryLine}
          </p>

          <div
            className={`mx-auto mt-4 grid max-w-[800px] grid-cols-2 sm:grid-cols-5 ${compact ? "gap-2 sm:gap-2" : "gap-2 sm:gap-2.5"}`}
          >
            <HeroStat label="Late" value={counts.overdue} warn={counts.overdue > 0} />
            <HeroStat label="Due soon" value={counts.atRisk} warn={counts.atRisk > 0} />
            <HeroStat label="Blocked" value={counts.blockers} warn={counts.blockers > 0} />
            <HeroStat label="Needs your OK" value={counts.approvals} />
            <HeroStat label="Ready to send" value={counts.pendingSends} warn={counts.pendingSends > 0} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 text-center backdrop-blur-md transition-colors sm:rounded-xl sm:px-2.5 sm:py-2 ${
        warn
          ? "border-amber-400/35 bg-amber-950/45 text-amber-50"
          : "border-white/[0.08] bg-black/28 text-white"
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg">{value}</p>
    </div>
  );
}
