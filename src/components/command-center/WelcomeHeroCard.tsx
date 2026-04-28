"use client";

import { useMemo } from "react";
import { Caveat } from "next/font/google";
import OverviewTimeOfDayArt from "@/components/overview/OverviewTimeOfDayArt";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  dayPeriodForHour,
  greetingForOverviewPeriod,
  type OverviewDayPeriod,
} from "@/components/overview/OverviewHomeHero";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import {
  lookupWorkspacePhotoSpecByPath,
  type OverviewHeroPeriod,
  type WorkspacePhotoSpec,
} from "@/lib/workspace-theme-photos";
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
  /** Profile bubbles under the greeting; omit or leave empty for script + time/location only. */
  avatarUrls?: Array<string | null | undefined>;
  showAvatarStrip?: boolean;
  /** Tighter hero for command-center density — stacks better with modules below. */
  compact?: boolean;
  /** IC / minimal shells: greeting + time · place only (no stats, summary line, role chip). */
  omitOperationalChrome?: boolean;
};

function toHeroPeriod(day: OverviewDayPeriod): OverviewHeroPeriod {
  return day === "morning" || day === "afternoon" || day === "evening" ? day : "night";
}

function dayOfYear(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function periodToOceanMod(p: OverviewHeroPeriod): string {
  switch (p) {
    case "morning":
      return "route5-welcome-ocean--morning";
    case "afternoon":
      return "route5-welcome-ocean--afternoon";
    case "evening":
      return "route5-welcome-ocean--evening";
    default:
      return "route5-welcome-ocean--night";
  }
}

/** Warm sky → navy stack + layered wave silhouettes — matches prefs gradient canvas art direction. */
function OceanGradientBackdrop({ period }: { period: OverviewHeroPeriod }) {
  const mod = periodToOceanMod(period);
  return (
    <div
      className={`route5-welcome-ocean pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${mod}`}
      aria-hidden
    >
      <div className="route5-welcome-ocean-sky absolute inset-0 rounded-[inherit]" />
      <div className="route5-welcome-ocean-glow" />
      <div className="route5-welcome-ocean-scrim" />
      <div className="route5-welcome-ocean-waves">
        <svg
          className="absolute inset-x-0 bottom-0 h-full w-[115%] -translate-x-[6.5%] text-[rgba(15,43,71,0.58)] md:w-full md:translate-x-0"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0 120 C240 92 380 148 620 118 C840 92 980 138 1180 108 C1290 95 1380 102 1440 118 L1440 210 L0 210 Z"
            opacity={0.45}
          />
          <path
            fill="currentColor"
            d="M0 154 C260 126 440 174 680 146 C940 118 1140 168 1440 132 L1440 210 L0 210 Z"
            opacity={0.28}
          />
        </svg>
      </div>
    </div>
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
  avatarUrls = [],
  showAvatarStrip = false,
  compact,
  omitOperationalChrome = false,
}: Props) {
  const { workspacePaletteLight } = useWorkspaceExperience();
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

  const heroPhotoOverride = useMemo(() => {
    const ctl = prefs.workspaceHeroPhotoSource;
    const canvasPhoto = (prefs.workspaceCanvasBackground ?? "gradient") === "photo";
    if (!canvasPhoto || !ctl || ctl.kind === "daily") {
      return { customUrl: null as string | null, forcedSpec: null as WorkspacePhotoSpec | null };
    }
    if (ctl.kind === "upload" && ctl.dataUrl?.startsWith("data:image/")) {
      return { customUrl: ctl.dataUrl, forcedSpec: null };
    }
    if (ctl.kind === "preset") {
      return { customUrl: null, forcedSpec: lookupWorkspacePhotoSpecByPath(ctl.path) ?? null };
    }
    return { customUrl: null, forcedSpec: null };
  }, [prefs.workspaceCanvasBackground, prefs.workspaceHeroPhotoSource]);

  const styleKind = prefs.welcomeHeroStyle ?? "atmospheric";
  const canvasBg = prefs.workspaceCanvasBackground ?? "gradient";
  const showHeroPhoto = canvasBg === "photo";
  const photoHeroLight = Boolean(showHeroPhoto && workspacePaletteLight);

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
        ? "px-4 py-5 md:px-6 md:py-5"
        : "px-5 py-6 md:px-7 md:py-6"
      : omitOperationalChrome && !compact
        ? "px-6 py-9 md:px-10 md:py-11"
        : "px-6 py-7 md:px-10 md:py-9";

  const accentRing =
    prefs.accentIntensity === "strong"
      ? "shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_24px_70px_-44px_rgba(8,145,178,0.35)]"
      : prefs.accentIntensity === "subtle"
        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.055)]"
        : "shadow-[0_0_0_1px_rgba(103,232,249,0.14),0_20px_64px_-48px_rgba(14,116,144,0.22)]";

  const headlineSize = omitOperationalChrome
    ? compact
      ? "text-[clamp(1.45rem,3.8vw,1.95rem)]"
      : "text-[clamp(1.55rem,4.2vw,2.35rem)]"
    : compact
      ? "text-[clamp(1.42rem,3.6vw,2rem)]"
      : "text-[clamp(1.78rem,4.6vw,2.65rem)] sm:text-[clamp(1.95rem,5vw,2.88rem)]";

  const roundingClass = compact ? "rounded-[24px] md:rounded-[30px]" : "rounded-[32px] md:rounded-[40px]";

  return (
    <section
      className={`route5-welcome-hero-shell relative overflow-hidden ${roundingClass} ${accentRing} ${densityClass} transition-[box-shadow,transform] duration-500 ease-out animate-[route5-page-enter_0.55s_ease-out_both]`}
    >
      {showHeroPhoto ? (
        <>
          <OverviewTimeOfDayArt
            period={periodHero}
            mode="photo"
            rotationIndex={rotationIndex}
            regionKey={prefs.workspaceRegionKey}
            readableTone={photoHeroLight ? "light" : "default"}
            forcedPhotoSpec={heroPhotoOverride.forcedSpec}
            customPhotoUrl={heroPhotoOverride.customUrl}
          />
          <div
            className={
              photoHeroLight
                ? "route5-welcome-photo-ocean-blend pointer-events-none absolute inset-0 opacity-95"
                : "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15"
            }
            aria-hidden
          />
        </>
      ) : styleKind === "minimal" ? (
        <div
          className={`pointer-events-none absolute inset-0 rounded-[inherit] route5-welcome-ocean-minimal ${periodToOceanMod(periodHero)}`}
          aria-hidden
        />
      ) : (
        <OceanGradientBackdrop period={periodHero} />
      )}

      {styleKind === "glass" ? (
        <div className="pointer-events-none absolute inset-0 bg-white/[0.045] backdrop-blur-[3px]" aria-hidden />
      ) : null}

      <div className={`relative z-[1] text-center ${photoHeroLight ? "text-slate-900" : ""}`}>
        <div className="relative mx-auto max-w-[640px] space-y-0">
          <p
            className={`${heroScript.className} ${headlineSize} leading-[1.1] tracking-[0.012em] ${
              photoHeroLight
                ? "text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]"
                : "text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.38)]"
            }`}
          >
            {greeting}, {firstName}
          </p>
          <p
            className={`font-sans mt-2 md:mt-3 text-[13px] font-medium tracking-[0.018em] md:text-[14px] ${
              photoHeroLight ? "text-slate-700" : "text-white/[0.82]"
            }`}
          >
            <span className={`tabular-nums ${photoHeroLight ? "text-slate-900" : "text-white/[0.92]"}`}>
              {timeStr}
            </span>
            <span className={`mx-1.5 select-none ${photoHeroLight ? "text-slate-400" : "text-white/45"}`} aria-hidden>
              ·
            </span>
            <span className="inline-block max-w-[min(100%,17rem)] text-center align-middle leading-snug">
              {placeLabel}
            </span>
          </p>
          {!omitOperationalChrome ? (
            <p
              className={`mt-2 md:mt-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                photoHeroLight
                  ? "border border-slate-400/35 bg-white/55 text-slate-600 backdrop-blur-sm"
                  : "border border-white/14 bg-black/25 text-cyan-100/75"
              }`}
            >
              {roleLabel}
            </p>
          ) : null}
          {showAvatarStrip ? (
            <div className="mt-3 flex justify-center gap-[-8px]">
              {avatarUrls.slice(0, 8).map((url, i) => (
                <span
                  key={i}
                  className={`-ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[10px] font-semibold first:ml-0 ${
                    photoHeroLight
                      ? "border-slate-300/70 bg-white/60 text-slate-800 backdrop-blur-sm"
                      : "border-white/20 bg-[#152028] text-white/90"
                  }`}
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
          ) : null}
          {!omitOperationalChrome ? (
            <p
              className={`mx-auto mt-3 max-w-[520px] text-[12px] leading-relaxed md:text-[13px] ${
                photoHeroLight ? "text-slate-700" : "text-white/[0.72]"
              }`}
            >
              {summaryLine}
            </p>
          ) : null}

          {!omitOperationalChrome ? (
            <div
              className={`mx-auto mt-4 grid max-w-[800px] grid-cols-2 sm:grid-cols-5 ${compact ? "gap-2 sm:gap-2" : "gap-2 sm:gap-2.5"}`}
            >
              <HeroStat
                label="Late"
                value={counts.overdue}
                warn={counts.overdue > 0}
                lightPhoto={photoHeroLight}
              />
              <HeroStat
                label="Due soon"
                value={counts.atRisk}
                warn={counts.atRisk > 0}
                lightPhoto={photoHeroLight}
              />
              <HeroStat
                label="Blocked"
                value={counts.blockers}
                warn={counts.blockers > 0}
                lightPhoto={photoHeroLight}
              />
              <HeroStat label="Needs your OK" value={counts.approvals} lightPhoto={photoHeroLight} />
              <HeroStat
                label="Ready to send"
                value={counts.pendingSends}
                warn={counts.pendingSends > 0}
                lightPhoto={photoHeroLight}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  warn,
  lightPhoto,
}: {
  label: string;
  value: number;
  warn?: boolean;
  lightPhoto?: boolean;
}) {
  const surface =
    warn
      ? "border-amber-400/35 bg-amber-950/45 text-amber-50"
      : lightPhoto
        ? "border-slate-200/80 bg-white/55 text-slate-900 backdrop-blur-md"
        : "border-white/[0.08] bg-black/28 text-white";
  const labelMuted = warn ? "text-amber-100/65" : lightPhoto ? "text-slate-500" : "text-white/45";
  return (
    <div className={`rounded-xl border px-2 py-1.5 text-center backdrop-blur-md transition-colors sm:rounded-2xl sm:px-2.5 sm:py-2 ${surface}`}>
      <p className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${labelMuted}`}>{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg">{value}</p>
    </div>
  );
}
