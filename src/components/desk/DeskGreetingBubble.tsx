"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Caveat } from "next/font/google";
import { getDeskContextLine, getDeskHeadline } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";
import {
  resolveWorkspaceTheme,
  type WorkspaceThemeId,
} from "@/lib/workspace-themes";
import { celestialsForCard, type DeskSkyPhase } from "@/lib/desk-greeting-solar";

const deskScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

function skyCanvasFor(
  phase: DeskSkyPhase,
  themeId: WorkspaceThemeId,
  dayProgress: number
): {
  base: string;
  wash: string;
  haze: string;
  sunCore: string;
  sunHalo: string;
  sunOpacity: number;
} {
  const t = themeId === "auto" ? "daytime" : themeId;
  const push =
    t === "ember" || t === "sunset" || t === "sunrise" || t === "vegas"
      ? 1
      : t === "ocean" || t === "daytime" || t === "lagunabeach"
        ? 0.5
        : 0;

  if (phase === "deep_night" || phase === "night") {
    return {
      base: "radial-gradient(120% 100% at 50% 0%, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.98) 45%, #020617 100%)",
      wash: "radial-gradient(80% 60% at 20% 15%, rgba(99, 102, 241, 0.12), transparent 50%)",
      haze: "linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(2, 6, 23, 0.5) 100%)",
      sunCore: "rgba(250, 250, 250, 0.9)",
      sunHalo: "rgba(56, 189, 248, 0.2)",
      sunOpacity: 0.12,
    };
  }
  if (phase === "dawn") {
    return {
      base: "radial-gradient(95% 80% at 15% 0%, rgba(254, 205, 211, 0.55) 0%, rgba(253, 230, 138, 0.25) 40%, rgba(12, 74, 110, 0.5) 100%)",
      wash: "radial-gradient(90% 70% at 100% 0%, rgba(125, 211, 252, 0.3), transparent 50%)",
      haze: "linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(15, 23, 42, 0.25) 100%)",
      sunCore: "rgba(255, 251, 235, 0.98)",
      sunHalo: "rgba(251, 191, 36, 0.45)",
      sunOpacity: 0.92,
    };
  }
  if (phase === "golden" || phase === "sunset") {
    const redBoost = push * 0.08;
    const g = Math.round(Math.max(160, Math.min(255, 230 - redBoost * 120)));
    const b = Math.round(Math.max(140, Math.min(255, 200 - redBoost * 80)));
    return {
      base: `
        radial-gradient(110% 90% at ${48 + dayProgress * 8}% -8%, rgba(251, 191, 36, ${0.42 + redBoost}), transparent 54%),
        radial-gradient(85% 65% at 95% 12%, rgba(249, 115, 22, ${0.28 + redBoost}), transparent 52%),
        radial-gradient(90% 75% at 8% 25%, rgba(244, 114, 182, 0.18), transparent 55%),
        linear-gradient(172deg, rgba(255, 247, 237, 0.92) 0%, rgba(254, 215, 170, 0.85) 42%, rgba(30, 58, 138, 0.55) 100%)
      `,
      wash: "linear-gradient(180deg, rgba(253, 186, 116, 0.15) 0%, transparent 42%, rgba(59, 130, 246, 0.18) 100%)",
      haze: "linear-gradient(175deg, rgba(255, 255, 255, 0.06) 0%, rgba(15, 23, 42, 0.35) 100%)",
      sunCore: `rgba(255, ${g}, ${b}, 0.98)`,
      sunHalo: `rgba(251, 113, 133, ${0.45 + redBoost})`,
      sunOpacity: 1,
    };
  }
  if (phase === "dusk") {
    return {
      base: `
        radial-gradient(100% 95% at 52% -6%, rgba(239, 68, 68, 0.28), transparent 54%),
        radial-gradient(80% 60% at 0% 70%, rgba(76, 29, 149, 0.22), transparent 55%),
        linear-gradient(178deg, #fdf2f8 0%, #fecdd3 38%, #1e1b4b 92%)
      `,
      wash: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(14, 165, 233, 0.14), transparent 58%)",
      haze: "linear-gradient(180deg, transparent 30%, rgba(15, 23, 42, 0.55) 100%)",
      sunCore: "rgba(253, 186, 116, 0.85)",
      sunHalo: "rgba(244, 63, 94, 0.5)",
      sunOpacity: 0.85,
    };
  }

  return {
    base: `
      radial-gradient(115% 85% at 48% -12%, rgba(186, 230, 253, ${0.38 + push * 0.06}), transparent 53%),
      radial-gradient(90% 65% at 95% 8%, rgba(125, 211, 252, 0.22), transparent 52%),
      linear-gradient(178deg, #ecfeff 0%, rgba(56, 189, 248, 0.22) 45%, rgba(15, 23, 42, 0.82) 100%)
    `,
    wash: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(14, 116, 144, 0.25) 100%)",
    haze: "linear-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(15, 23, 42, 0.28) 100%)",
    sunCore: "rgba(254, 249, 195, 0.98)",
    sunHalo: "rgba(56, 189, 248, 0.35)",
    sunOpacity: 1,
  };
}

function oceanPalette(phase: DeskSkyPhase, themeId: Exclude<WorkspaceThemeId, "auto">): string {
  if (phase === "deep_night" || phase === "night") return "text-indigo-300/50";
  if (phase === "dusk" || themeId === "ember" || themeId === "vegas") return "text-rose-400/55";
  if (phase === "golden" || phase === "sunset") return "text-orange-300/50";
  return "text-cyan-300/55";
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
    () => exp.prefs.workspaceTimezone?.trim() || getBrowserIanaTimezone(),
    [exp.prefs.workspaceTimezone]
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

  return (
    <div className="flex w-full justify-center px-1 sm:px-2">
      <div
        className="relative w-full max-w-[min(100%,26rem)] overflow-hidden rounded-[28px] border border-white/[0.14] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_28px_56px_-20px_rgba(0,0,0,0.55),0_12px_40px_-12px_rgba(14,165,233,0.18)] sm:max-w-lg"
        aria-label={`${headline} ${contextLine}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background: sky.base,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          aria-hidden
          style={{ background: sky.wash }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
          aria-hidden
          style={{ background: sky.haze }}
        />

        {celestials.showSun ? (
          <>
            <div
              className="pointer-events-none absolute rounded-full blur-[2px]"
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
              className="pointer-events-none absolute h-[min(14vw,3rem)] w-[min(140%,40rem)] max-w-none rounded-[100%] opacity-[0.22]"
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
          className={`desk-greeting-wave-drift pointer-events-none absolute -bottom-px left-[-14%] right-[-14%] z-[3] h-[6rem] ${oceanClass} sm:h-[7rem]`}
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
          className={`desk-greeting-wave-drift-2 pointer-events-none absolute -bottom-px left-[-18%] right-[-18%] z-[3] h-[5rem] ${oceanClass} opacity-75 sm:h-[6rem]`}
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
          className="desk-greeting-foam pointer-events-none absolute bottom-0 left-0 right-0 z-[4] h-12 bg-gradient-to-t from-[rgba(15,23,42,0.48)] via-[rgba(15,23,42,0.12)] to-transparent sm:h-14"
          aria-hidden
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
