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

/**
 * Compact time-aware greeting for the workspace header center column.
 * Reuses the same copy logic as the former Feed hero greeting.
 */
export default function WorkspaceHeaderGreeting() {
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

  return (
    <div className={`min-w-0 max-w-full text-center ${pulseClass}`} title={titleAttr}>
      <p className="truncate text-[13px] leading-[var(--r5-leading-heading)] text-r5-text-primary">
        <span className="font-semibold">{headline}</span>
      </p>
      {orgLine ? (
        <p className="mt-0.5 truncate text-[11px] font-medium text-r5-text-tertiary" title={orgLine}>
          {orgLine.length > 96 ? `${orgLine.slice(0, 93)}…` : orgLine}
        </p>
      ) : null}
    </div>
  );
}
