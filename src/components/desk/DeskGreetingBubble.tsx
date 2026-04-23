"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Caveat } from "next/font/google";
import { getDeskContextLine, getDeskHeadline } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getWorkspaceIanaTimeZone } from "@/lib/workspace-regions";
import {
  resolveWorkspaceTheme,
  type WorkspaceThemeId,
} from "@/lib/workspace-themes";
import {
  WORKSPACE_THEME_PHOTO,
  workspacePhotoUrl,
} from "@/lib/workspace-theme-photos";
import { celestialsForCard, type DeskSkyPhase } from "@/lib/desk-greeting-solar";

const deskScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/** Star positions: deterministic, SSR/hydration-safe. */
const STAR_DOTS = Array.from({ length: 42 }, (_, i) => ({
  left: 4 + (i * 19 + (i % 7) * 11) % 90,
  top: 2 + (i * 7 + (i % 5) * 5) % 32,
  r: 0.5 + (i % 3) * 0.35,
  o: 0.18 + (i % 6) * 0.1,
}));

type SkyCanvas = {
  base: string;
  wash: string;
  haze: string;
  sunCore: string;
  sunHalo: string;
  sunOpacity: number;
  /** Bottom 35–50%: Pacific / Laguna water band (varies with phase). */
  oceanBand: string;
  /** Shore foam & depth at the very bottom. */
  beachFoam: string;
  palmOpacity: number;
  showStars: boolean;
  /** Slight high-altitude clouds for midday. */
  highClouds?: string;
};

function skyCanvasFor(
  phase: DeskSkyPhase,
  themeId: WorkspaceThemeId,
  dayProgress: number
): SkyCanvas {
  const t = themeId === "auto" ? "daytime" : themeId;
  const push =
    t === "ember" || t === "sunset" || t === "sunrise" || t === "vegas"
      ? 1
      : t === "ocean" || t === "daytime" || t === "lagunabeach"
        ? 0.5
        : 0;
  const dp = 0.25 + dayProgress * 0.5;

  if (phase === "deep_night" || phase === "night") {
    return {
      base: "radial-gradient(120% 100% at 50% 0%, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.98) 50%, #020617 100%)",
      wash: "radial-gradient(80% 60% at 20% 15%, rgba(99, 102, 241, 0.11), transparent 50%)",
      haze: "linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(2, 6, 23, 0.5) 100%)",
      sunCore: "rgba(250, 250, 250, 0.9)",
      sunHalo: "rgba(56, 189, 248, 0.2)",
      sunOpacity: 0.1,
      oceanBand:
        "linear-gradient(180deg, transparent 0%, transparent 40%, rgba(8, 47, 73, 0.55) 55%, rgba(2, 12, 27, 0.88) 78%, rgba(2, 6, 23, 0.95) 100%)",
      beachFoam:
        "linear-gradient(180deg, rgba(2,6,23,0.1) 0%, rgba(15,23,42,0.65) 55%, rgba(2,6,23,0.92) 100%)",
      palmOpacity: 0.32 + push * 0.08,
      showStars: true,
    };
  }
  if (phase === "dawn") {
    return {
      base: `
        radial-gradient(100% 85% at 18% -2%, rgba(255, 183, 197, 0.65) 0%, rgba(255, 237, 213, 0.45) 32%, transparent 58%),
        radial-gradient(80% 70% at 92% 0%, rgba(56, 189, 248, 0.28) 0%, transparent 50%),
        linear-gradient(178deg, #fff1f2 0%, #bae6fd 45%, #0c4a6e 100%)
      `,
      wash: "radial-gradient(95% 55% at 50% 8%, rgba(255, 251, 235, 0.2), transparent 50%)",
      haze: "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(8, 51, 68, 0.2) 100%)",
      sunCore: "rgba(255, 250, 240, 0.99)",
      sunHalo: "rgba(253, 186, 116, 0.55)",
      sunOpacity: 0.95,
      oceanBand:
        "linear-gradient(180deg, transparent 0%, transparent 42%, rgba(14, 165, 233, 0.4) 52%, rgba(8, 89, 133, 0.8) 72%, rgba(12, 74, 110, 0.92) 100%)",
      beachFoam:
        "linear-gradient(180deg, transparent 0%, rgba(254, 215, 170, 0.12) 50%, rgba(2, 12, 27, 0.4) 100%)",
      palmOpacity: 0.48 + push * 0.1,
      showStars: false,
    };
  }
  if (phase === "day") {
    return {
      base: `
        radial-gradient(100% 75% at 50% -2%, rgba(56, 189, 248, 0.55) 0%, rgba(125, 211, 252, 0.28) 38%, rgba(8, 145, 178, 0) 60%),
        radial-gradient(90% 50% at 5% 15%, rgba(165, 243, 252, 0.35) 0%, transparent 50%),
        linear-gradient(182deg, #7dd3fc 0%, #38bdf8 32%, #bae6fd 58%, #0c4a6e 100%)
      `,
      wash: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 35%, rgba(14, 116, 144, 0.2) 100%)",
      haze: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(3, 105, 161, 0.15) 100%)",
      sunCore: "rgba(255, 253, 230, 0.99)",
      sunHalo: "rgba(125, 211, 252, 0.5)",
      sunOpacity: 1,
      highClouds:
        "radial-gradient(60% 25% at 70% 8%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%)",
      oceanBand: `
        linear-gradient(180deg, transparent 0%, transparent 38%,
        rgba(14, 165, 233, 0.35) 46%,
        rgba(6, 182, 212, ${0.5 + push * 0.08}) 60%,
        rgba(2, 132, 199, 0.88) 80%,
        rgba(4, 47, 80, 0.96) 100%)
      `
        .replace(/\s+/g, " ")
        .trim(),
      beachFoam: `linear-gradient(180deg, transparent 0%, rgba(224, 242, 254, 0.15) 55%, rgba(2, 12, 27, ${0.5 + push * 0.05}) 100%)`,
      palmOpacity: 0.52 + push * 0.12,
      showStars: false,
    };
  }
  if (phase === "golden" || phase === "sunset") {
    const redBoost = push * 0.08;
    const g = Math.round(Math.max(160, Math.min(255, 230 - redBoost * 120)));
    const b = Math.round(Math.max(140, Math.min(255, 200 - redBoost * 80)));
    return {
      base: `
        radial-gradient(110% 90% at ${48 + dayProgress * 8}% -8%, rgba(251, 191, 36, ${0.45 + redBoost}), transparent 54%),
        radial-gradient(85% 65% at 95% 8%, rgba(249, 115, 22, ${0.32 + redBoost}), transparent 52%),
        radial-gradient(90% 70% at 5% 22%, rgba(52, 211, 153, 0.12) 0%, transparent 50%),
        linear-gradient(172deg, #fff7ed 0%, #fb923c 30%, #f97316 50%, #1d4ed8 100%)
      `,
      wash: "linear-gradient(180deg, rgba(253, 186, 116, 0.2) 0%, transparent 40%, rgba(30, 64, 175, 0.22) 100%)",
      haze: "linear-gradient(175deg, rgba(255, 255, 255, 0.07) 0%, rgba(15, 23, 42, 0.4) 100%)",
      sunCore: `rgba(255, ${g}, ${b}, 0.99)`,
      sunHalo: `rgba(251, 113, 133, ${0.5 + redBoost})`,
      sunOpacity: 1,
      oceanBand: `
        linear-gradient(180deg, transparent 0%, transparent 36%,
        rgba(251, 191, 36, ${0.2 + redBoost * 0.2}) 48%,
        rgba(234, 88, 12, ${0.45 + dp * 0.1}) 68%,
        rgba(30, 64, 175, ${0.55 + redBoost * 0.1}) 100%)
      `
        .replace(/\s+/g, " ")
        .trim(),
      beachFoam:
        "linear-gradient(180deg, transparent 0%, rgba(254, 159, 125, 0.12) 55%, rgba(15, 23, 42, 0.5) 100%)",
      palmOpacity: 0.58 + push * 0.1,
      showStars: false,
    };
  }
  if (phase === "dusk") {
    return {
      base: `
        radial-gradient(100% 90% at 50% -4%, rgba(190, 24, 93, 0.2), transparent 52%),
        radial-gradient(80% 55% at 0% 30%, rgba(99, 102, 241, 0.18) 0%, transparent 50%),
        linear-gradient(178deg, #fce7f3 0%, #f9a8d4 32%, #312e81 92%)
      `,
      wash: "radial-gradient(ellipse 80% 45% at 50% 20%, rgba(14, 165, 233, 0.12) 0%, transparent 50%)",
      haze: "linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(2, 6, 23, 0.55) 100%)",
      sunCore: "rgba(254, 215, 170, 0.88)",
      sunHalo: "rgba(192, 38, 211, 0.45)",
      sunOpacity: 0.8,
      oceanBand:
        "linear-gradient(180deg, transparent 0%, rgba(6, 78, 115, 0.35) 50%, rgba(2, 12, 27, 0.9) 100%)",
      beachFoam:
        "linear-gradient(180deg, transparent 0%, rgba(76, 29, 149, 0.15) 50%, rgba(2, 6, 23, 0.75) 100%)",
      palmOpacity: 0.4 + push * 0.08,
      showStars: false,
    };
  }

  // Fallback: treat as clear coastal daytime.
  return {
    base: `
      radial-gradient(115% 85% at 48% -10%, rgba(56, 189, 248, 0.45) 0%, rgba(8, 145, 178, 0) 50%),
      linear-gradient(178deg, #e0f2fe 0%, #38bdf8 38%, #0e7490 100%)
    `,
    wash: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(14, 116, 144, 0.2) 100%)",
    haze: "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(3, 105, 161, 0.12) 100%)",
    sunCore: "rgba(254, 252, 232, 0.99)",
    sunHalo: "rgba(14, 165, 233, 0.38)",
    sunOpacity: 1,
    highClouds:
      "radial-gradient(50% 18% at 32% 6%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
    oceanBand:
      "linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.45) 52%, rgba(4, 47, 80, 0.92) 100%)",
    beachFoam: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(12, 74, 110, 0.35) 100%)",
    palmOpacity: 0.5 + push * 0.1,
    showStars: false,
  };
}

function oceanPalette(phase: DeskSkyPhase, themeId: Exclude<WorkspaceThemeId, "auto">): string {
  if (phase === "deep_night" || phase === "night") return "text-indigo-200/50";
  if (phase === "dusk" || themeId === "ember" || themeId === "vegas") return "text-fuchsia-300/50";
  if (phase === "golden" || phase === "sunset") return "text-amber-200/55";
  if (phase === "dawn") return "text-sky-200/55";
  return "text-cyan-200/60";
}

/** Stylized coastal palm (stroke-only silhouette). */
function PalmSilhouette({ className, mirrored }: { className?: string; mirrored?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 100"
      fill="none"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-950/80"
        strokeWidth="2.4"
        opacity="0.88"
      >
        <path d="M32 95V52" />
        <path d="M32 54C18 40 2 4 0 0" />
        <path d="M32 50C26 20 20 2 20 0" />
        <path d="M32 50C38 20 44 2 44 0" />
        <path d="M32 54C44 40 64 4 64 0" />
        <path d="M32 58C18 64 4 80 0 100" />
        <path d="M32 58C46 64 60 80 64 100" />
        <path d="M20 100c2-4 8-6 12-2" />
        <path d="M44 100c-2-4-8-6-12-2" />
      </g>
    </svg>
  );
}

export default function DeskGreetingBubble() {
  const { user } = useUser();
  const exp = useWorkspaceExperience();
  const { intlLocale } = useI18n();
  const minuteClockTick = useAlignedMinuteTick();

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";
  const first = displayName.trim().split(/\s+/)[0] || "there";

  const effectiveIana = useMemo(
    () => getWorkspaceIanaTimeZone(exp.prefs.workspaceTimezone, exp.prefs.workspaceRegionKey),
    [exp.prefs.workspaceRegionKey, exp.prefs.workspaceTimezone]
  );

  const liveTheme = useMemo(
    () => resolveWorkspaceTheme(exp.prefs, minuteClockTick),
    [exp.prefs, minuteClockTick]
  );

  const celestials = useMemo(() => {
    const now = minuteClockTick ? new Date(minuteClockTick) : new Date();
    return celestialsForCard(now, effectiveIana);
  }, [effectiveIana, minuteClockTick]);

  const solar = celestials.solar;

  const headline = useMemo(() => {
    void minuteClockTick;
    return getDeskHeadline(first, effectiveIana);
  }, [first, effectiveIana, minuteClockTick]);

  const contextLine = useMemo(() => {
    void minuteClockTick;
    return getDeskContextLine(effectiveIana, exp.prefs.workspaceRegionKey, intlLocale);
  }, [effectiveIana, exp.prefs.workspaceRegionKey, intlLocale, minuteClockTick]);

  const sky = useMemo(
    () => skyCanvasFor(solar.phase, liveTheme.themeId, solar.dayProgress),
    [liveTheme.themeId, solar.dayProgress, solar.phase]
  );

  const oceanClass = oceanPalette(solar.phase, liveTheme.resolvedId);

  const placePhoto = WORKSPACE_THEME_PHOTO[liveTheme.resolvedId];
  const placePhotoUrl = workspacePhotoUrl(placePhoto.path, 960);

  return (
    <div className="flex w-full justify-center px-1 sm:px-2">
      <div
        className="relative w-full max-w-[min(100%,26rem)] overflow-hidden rounded-[28px] border border-white/[0.14] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_28px_56px_-20px_rgba(0,0,0,0.55),0_12px_40px_-12px_rgba(14,165,233,0.18)] sm:max-w-lg"
        aria-label={`${headline} ${contextLine}`}
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={placePhotoUrl}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage: placePhoto.scrim,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
          style={{
            background: sky.base,
            opacity: 0.22,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-95"
          aria-hidden
          style={{ background: sky.wash, opacity: 0.35 }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-40 mix-blend-soft-light"
          aria-hidden
          style={{ background: sky.haze, opacity: 0.35 }}
        />

        {sky.highClouds ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.42]"
            aria-hidden
            style={{ background: sky.highClouds }}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(52%,13rem)]"
          aria-hidden
          style={{ background: sky.oceanBand, opacity: 0.45 }}
        />

        {sky.showStars ? (
          <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
            {STAR_DOTS.map((s, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.r,
                  height: s.r,
                  opacity: s.o,
                }}
              />
            ))}
          </div>
        ) : null}

        {celestials.showSun ? (
          <>
            <div
              className="pointer-events-none absolute z-[2] rounded-full blur-[2px]"
              aria-hidden
              style={{
                width: "min(22vw, 5.25rem)",
                height: "min(22vw, 5.25rem)",
                left: `${solar.sunLeftPct}%`,
                top: `${solar.sunTopPct}%`,
                transform: "translate(-50%, -50%)",
                opacity: sky.sunOpacity,
                background: `radial-gradient(circle at 35% 35%, ${sky.sunCore} 0%, ${sky.sunHalo} 52%, transparent 68%)`,
                boxShadow: `0 0 55px 22px ${sky.sunHalo}`,
              }}
            />
            <div
              className="pointer-events-none absolute z-[2] h-[min(14vw,3rem)] w-[min(140%,40rem)] max-w-none rounded-[100%] opacity-[0.22]"
              aria-hidden
              style={{
                left: `${solar.sunLeftPct}%`,
                top: `${Math.min(58, solar.sunTopPct + 18)}%`,
                transform: "translate(-50%, -50%) rotate(-2deg)",
                background: `linear-gradient(90deg, transparent 0%, ${sky.sunHalo} 48%, transparent 100%)`,
              }}
            />
          </>
        ) : null}

        {celestials.showMoon ? (
          <div
            className="desk-greeting-moon-host pointer-events-none absolute z-[2]"
            aria-hidden
            style={{
              left: `${celestials.moonLeftPct}%`,
              top: `${celestials.moonTopPct}%`,
              transform: "translate(-50%, -50%)",
              width: "min(17vw, 4.25rem)",
              height: "min(17vw, 4.25rem)",
            }}
          >
            <div className="desk-greeting-moon-sink relative h-full w-full">
              <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_0_28px_rgba(226,232,240,0.55)]">
                <defs>
                  <radialGradient id="moonFace" cx="42%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="55%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </radialGradient>
                  <radialGradient id="moonShadow" cx="72%" cy="35%" r="48%">
                    <stop offset="0%" stopColor="rgba(148,163,184,0.35)" />
                    <stop offset="100%" stopColor="rgba(148,163,184,0)" />
                  </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="26" fill="url(#moonFace)" />
                <circle cx="40" cy="28" r="26" fill="url(#moonShadow)" />
              </svg>
            </div>
          </div>
        ) : null}

        <div
          className="pointer-events-none absolute bottom-0 left-[-2%] z-[2] w-[min(32%,5.5rem)] max-w-[5.5rem] sm:left-0"
          style={{ opacity: sky.palmOpacity * 0.18 }}
          aria-hidden
        >
          <PalmSilhouette className="h-auto w-full" />
        </div>
        <div
          className="pointer-events-none absolute bottom-0 right-[-2%] z-[2] w-[min(32%,5.5rem)] max-w-[5.5rem] sm:right-0"
          style={{ opacity: sky.palmOpacity * 0.18 }}
          aria-hidden
        >
          <PalmSilhouette className="h-auto w-full" mirrored />
        </div>

        <div
          className={`desk-greeting-wave-drift pointer-events-none absolute -bottom-px left-[-14%] right-[-14%] z-[3] h-[6rem] opacity-35 ${oceanClass} sm:h-[7rem]`}
          aria-hidden
        >
          <svg className="h-full w-[128%] max-w-none" viewBox="0 0 1200 140" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g-wave-a" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.62" />
              </linearGradient>
            </defs>
            <path
              fill="url(#g-wave-a)"
              d="M0,96 C220,118 380,74 600,92 C820,110 980,78 1200,96 L1200,140 L0,140 Z"
            />
            <path
              fill="currentColor"
              fillOpacity={0.42}
              d="M0,104 C180,84 420,118 660,96 C860,78 1040,112 1200,98 L1200,140 L0,140 Z"
            />
            <path
              fill="currentColor"
              fillOpacity={0.58}
              d="M0,114 C260,96 520,126 780,104 C940,92 1080,118 1200,108 L1200,140 L0,140 Z"
            />
          </svg>
        </div>
        <div
          className={`desk-greeting-wave-drift-2 pointer-events-none absolute -bottom-px left-[-18%] right-[-18%] z-[3] h-[5rem] ${oceanClass} opacity-25 sm:h-[6rem]`}
          aria-hidden
        >
          <svg className="h-full w-[136%] max-w-none" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              fill="currentColor"
              fillOpacity={0.35}
              d="M0,78 C200,62 400,94 600,78 C800,62 1000,94 1200,78 L1200,120 L0,120 Z"
            />
            <path
              fill="currentColor"
              fillOpacity={0.55}
              d="M0,88 C240,102 480,70 720,86 C920,100 1060,74 1200,84 L1200,120 L0,120 Z"
            />
          </svg>
        </div>
        <div
          className="desk-greeting-foam pointer-events-none absolute bottom-0 left-0 right-0 z-[4] h-12 sm:h-14"
          aria-hidden
          style={{ background: sky.beachFoam }}
        />

        <div className="relative z-[6] px-7 pb-11 pt-9 text-center sm:px-9 sm:pb-12 sm:pt-10">
          <p
            className={`${deskScript.className} mx-auto max-w-[20ch] text-balance text-[clamp(1.65rem,5vw,2.45rem)] font-semibold leading-[1.12] tracking-[0.01em] text-[#fffdf8] drop-shadow-[0_2px_14px_rgba(15,23,42,0.45)]`}
            style={{
              textShadow: "0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {headline}
          </p>
          <p className="mt-3 text-[12px] font-medium leading-relaxed tracking-[0.06em] text-sky-50/90 sm:text-[13px]">
            {contextLine}
          </p>
        </div>
      </div>
    </div>
  );
}
