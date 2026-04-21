"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useReducedMotion } from "framer-motion";
import {
  getHeroHeadline,
  getOverviewPersonalSubline,
  type WorkspaceInsightContext,
} from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";

type WorkspaceHeaderGreetingProps = {
  /** `desk-bar`: two lines, left-aligned — used under main chrome on Desk (coastal strip). */
  variant?: "default" | "desk-bar";
};

/**
 * Compact time-aware greeting for the workspace header center column.
 * Reuses the same copy logic as the former Feed hero greeting.
 */
export default function WorkspaceHeaderGreeting({
  variant = "default",
}: WorkspaceHeaderGreetingProps) {
  const { user } = useUser();
  const { summary, loadingSummary } = useWorkspaceData();
  const exp = useWorkspaceExperience();
  const { intlLocale } = useI18n();
  const minuteClockTick = useAlignedMinuteTick();
  const reduceMotion = useReducedMotion();

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

  const insightCtx = useMemo<WorkspaceInsightContext>(
    () => ({
      projectCount: summary.projectCount,
      extractionCount: summary.extractionCount,
      readiness: summary.readiness,
      latestExtraction: summary.recent[0] ?? undefined,
    }),
    [summary.projectCount, summary.extractionCount, summary.readiness, summary.recent]
  );

  const headline = useMemo(() => {
    void minuteClockTick;
    return getHeroHeadline(first, user?.id, effectiveIana);
  }, [first, user?.id, effectiveIana, minuteClockTick]);

  const personalSub = useMemo(() => {
    void minuteClockTick;
    return getOverviewPersonalSubline(
      insightCtx,
      user?.id,
      effectiveIana,
      exp.prefs.workspaceRegionKey,
      intlLocale
    );
  }, [insightCtx, user?.id, effectiveIana, exp.prefs.workspaceRegionKey, intlLocale, minuteClockTick]);

  const pulseClass =
    loadingSummary && !reduceMotion ? "motion-safe:animate-pulse motion-reduce:animate-none" : "";

  const orgLine = exp.prefs.dashboardCompanyNote?.trim();
  const titleAttr = `${headline} — ${personalSub}${orgLine ? ` · ${orgLine}` : ""}`;
  const isDeskBar = variant === "desk-bar";

  if (isDeskBar) {
    return (
      <div
        className={`min-w-0 max-w-full text-left ${pulseClass}`}
        title={titleAttr}
        aria-label={titleAttr}
      >
        <p className="text-[13px] font-semibold leading-snug tracking-[-0.02em] text-sky-100/95 sm:text-[14px]">
          {headline}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-sky-200/55 sm:text-[12px] sm:line-clamp-1">
          {personalSub}
        </p>
        {orgLine ? (
          <p className="mt-1 truncate text-[10px] font-medium text-sky-300/40" title={orgLine}>
            {orgLine.length > 80 ? `${orgLine.slice(0, 77)}…` : orgLine}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`min-w-0 max-w-full text-center ${pulseClass}`} title={titleAttr}>
      <p className="truncate text-[length:var(--r5-font-subheading)] leading-[var(--r5-leading-heading)] text-r5-text-primary">
        <span className="font-semibold">{headline}</span>
        <span className="font-normal text-r5-text-secondary">
          {" "}
          — {personalSub}
        </span>
      </p>
      {orgLine ? (
        <p className="mt-0.5 truncate text-[11px] font-medium text-r5-text-tertiary" title={orgLine}>
          {orgLine.length > 96 ? `${orgLine.slice(0, 93)}…` : orgLine}
        </p>
      ) : null}
    </div>
  );
}
