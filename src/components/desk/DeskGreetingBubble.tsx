"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { getDeskContextLine, getDeskHeadline } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";

/**
 * Compact greeting for Desk — sits in-page (not in the sticky header): name, clock, place only.
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
    <div
      className="relative isolate overflow-hidden rounded-2xl border border-sky-400/12 bg-gradient-to-b from-sky-950/35 via-[var(--workspace-canvas)]/60 to-[var(--workspace-canvas)]/85 px-4 py-3 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.45)] sm:px-5 sm:py-3.5"
      aria-label={`${headline} ${contextLine}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 15% -20%, rgba(56, 189, 248, 0.12), transparent 45%), radial-gradient(ellipse 80% 60% at 90% 110%, rgba(251, 191, 36, 0.05), transparent 50%)",
        }}
      />
      {/* Soft wave band — symbolic, low visual weight */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 h-7 w-full text-sky-400/15 [mask-image:linear-gradient(to_top,black,transparent)] sm:h-8"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M0 32c120-18 240-18 360 0s240 18 360 0 240-18 360 0 240 18 360 0V48H0z"
        />
        <path
          fill="currentColor"
          fillOpacity={0.55}
          d="M0 38c160-10 320-10 480 0s320 10 480 0 320-10 480 0V48H0z"
        />
      </svg>
      <div className="relative">
        <p className="text-[14px] font-semibold leading-snug tracking-[-0.02em] text-[var(--workspace-fg)] sm:text-[15px]">
          {headline}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-[var(--workspace-muted-fg)] sm:text-[13px]">
          {contextLine}
        </p>
      </div>
    </div>
  );
}
