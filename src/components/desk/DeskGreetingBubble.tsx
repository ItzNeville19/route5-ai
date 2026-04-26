"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Caveat } from "next/font/google";
import { getDeskContextLine, getDeskHeadline } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getWorkspaceIanaTimeZone } from "@/lib/workspace-regions";
import { resolveWorkspaceTheme } from "@/lib/workspace-themes";
import {
  PHOTO_FALLBACK_PUBLIC,
  overviewHeroMeshStyle,
  pickWorkspaceThemePhoto,
  workspacePhotoUrl,
} from "@/lib/workspace-theme-photos";

const deskScript = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export default function DeskGreetingBubble({ compact = false }: { compact?: boolean }) {
  const { user } = useUser();
  const exp = useWorkspaceExperience();
  const { intlLocale } = useI18n();
  const minuteClockTick = useAlignedMinuteTick();
  const [photoFailed, setPhotoFailed] = useState(false);

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

  const headline = useMemo(() => {
    void minuteClockTick;
    return getDeskHeadline(first, effectiveIana);
  }, [first, effectiveIana, minuteClockTick]);

  const contextLine = useMemo(() => {
    void minuteClockTick;
    return getDeskContextLine(effectiveIana, exp.prefs.workspaceRegionKey, intlLocale);
  }, [effectiveIana, exp.prefs.workspaceRegionKey, intlLocale, minuteClockTick]);

  /** One photograph + light bottom fade for text — no decorative mesh overlays. Rotates daily per theme pool. */
  const placePhoto = useMemo(
    () => pickWorkspaceThemePhoto(liveTheme.resolvedId, new Date()),
    [liveTheme.resolvedId]
  );
  const canvasMode = (exp.prefs.workspaceCanvasBackground ?? "gradient") === "photo" ? "photo" : "gradient";

  const placePhotoUrl = workspacePhotoUrl(placePhoto.path, 960);
  const imgSrc = photoFailed ? PHOTO_FALLBACK_PUBLIC : placePhotoUrl;

  useEffect(() => {
    setPhotoFailed(false);
  }, [placePhotoUrl]);

  return (
    <div className="flex w-full justify-center px-1 sm:px-2">
      <div
        className={`relative w-full max-w-[min(100%,26rem)] overflow-hidden border border-white/[0.14] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_24px_46px_-22px_rgba(0,0,0,0.5)] sm:max-w-lg ${
          compact ? "rounded-[20px]" : "rounded-[28px]"
        }`}
        aria-label={`${headline} ${contextLine}`}
      >
        {canvasMode === "photo" ? (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              className={`h-full w-full scale-105 object-cover object-center ${compact ? "min-h-[8rem]" : "min-h-[12.5rem]"}`}
              decoding="async"
              loading="eager"
              onError={() => setPhotoFailed(true)}
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
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/[0.82] via-slate-950/35 to-transparent"
              aria-hidden
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
            style={overviewHeroMeshStyle("afternoon", 0)}
            aria-hidden
          />
        )}

        <div
          className={`relative z-[6] text-center ${compact ? "px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6" : "px-7 pb-11 pt-9 sm:px-9 sm:pb-12 sm:pt-10"}`}
        >
          <p
            className={`${deskScript.className} mx-auto max-w-[20ch] text-balance font-semibold leading-[1.12] tracking-[0.01em] text-[#fffdf8] drop-shadow-[0_2px_14px_rgba(15,23,42,0.45)] ${compact ? "text-[clamp(1.45rem,4vw,2rem)]" : "text-[clamp(1.65rem,5vw,2.45rem)]"}`}
            style={{
              textShadow: "0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {headline}
          </p>
          <p className={`font-medium leading-relaxed tracking-[0.06em] text-sky-50/90 ${compact ? "mt-1.5 text-[11px] sm:text-[12px]" : "mt-3 text-[12px] sm:text-[13px]"}`}>
            {contextLine}
          </p>
        </div>
      </div>
    </div>
  );
}
