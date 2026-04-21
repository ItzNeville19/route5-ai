"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Caveat } from "next/font/google";
import { getDeskContextLine, getDeskHeadline } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";

const deskScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/**
 * Floating desk greeting — visually separate from chrome & commitments: sunset → ocean wash,
 * layered waves, handwriting headline; time/place line stays calm sans-serif.
 */
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

  const headline = useMemo(() => {
    void minuteClockTick;
    return getDeskHeadline(first, effectiveIana);
  }, [first, effectiveIana, minuteClockTick]);

  const contextLine = useMemo(() => {
    void minuteClockTick;
    return getDeskContextLine(effectiveIana, exp.prefs.workspaceRegionKey, intlLocale);
  }, [effectiveIana, exp.prefs.workspaceRegionKey, intlLocale, minuteClockTick]);

  return (
    <div className="flex w-full justify-center px-1 sm:px-2">
      <div
        className="relative w-full max-w-[min(100%,22rem)] overflow-hidden rounded-[28px] border border-white/[0.14] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_28px_56px_-20px_rgba(0,0,0,0.55),0_12px_40px_-12px_rgba(14,165,233,0.18)] sm:max-w-lg"
        aria-label={`${headline} ${contextLine}`}
      >
        {/* Faded sunset → sky → deep water */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background: `
              radial-gradient(120% 90% at 50% -10%, rgba(255, 237, 213, 0.5), transparent 52%),
              radial-gradient(90% 70% at 100% 0%, rgba(251, 207, 232, 0.22), transparent 45%),
              radial-gradient(100% 80% at 0% 20%, rgba(165, 243, 252, 0.2), transparent 50%),
              linear-gradient(165deg,
                rgba(30, 41, 59, 0.15) 0%,
                rgba(12, 74, 110, 0.42) 38%,
                rgba(15, 23, 42, 0.88) 100%
              )
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 180, 160, 0.12) 0%, transparent 35%, rgba(59, 130, 246, 0.15) 100%)",
          }}
        />

        {/* Layered ocean waves */}
        <div
          className="desk-greeting-wave-drift pointer-events-none absolute -bottom-px left-[-12%] right-[-12%] h-[5.5rem] text-sky-300/45 sm:h-[6.5rem]"
          aria-hidden
        >
          <svg className="h-full w-[124%] max-w-none" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              fill="currentColor"
              fillOpacity={0.35}
              d="M0,88 C200,72 400,104 600,88 C800,72 1000,104 1200,88 L1200,120 L0,120 Z"
            />
            <path
              fill="currentColor"
              fillOpacity={0.5}
              d="M0,96 C180,108 360,76 540,92 C720,108 900,76 1080,92 C1120,96 1160,94 1200,90 L1200,120 L0,120 Z"
            />
            <path
              fill="currentColor"
              fillOpacity={0.65}
              d="M0,102 C240,94 480,114 720,98 C960,82 1080,106 1200,100 L1200,120 L0,120 Z"
            />
          </svg>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[rgba(15,23,42,0.55)] to-transparent sm:h-20"
          aria-hidden
        />

        <div className="relative px-7 pb-10 pt-8 text-center sm:px-9 sm:pb-11 sm:pt-9">
          <p
            className={`${deskScript.className} mx-auto max-w-[18ch] text-[clamp(1.65rem,5vw,2.35rem)] font-semibold leading-[1.15] tracking-[0.01em] text-[#fff7ed] drop-shadow-[0_2px_12px_rgba(15,23,42,0.35)]`}
          >
            {headline}
          </p>
          <p className="mt-3 text-[12px] font-medium leading-relaxed tracking-[0.04em] text-sky-100/85 sm:text-[13px]">
            {contextLine}
          </p>
        </div>
      </div>
    </div>
  );
}
