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

/** Same personalized block as Overview hero — time-aware headline + local time / context line. */
export default function FeedPersonalGreeting() {
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

  return (
    <header className={`mb-[var(--r5-space-4)] ${pulseClass}`}>
      <p className="text-[clamp(1.05rem,2.4vw,1.25rem)] font-[var(--r5-font-weight-semibold)] leading-[var(--r5-leading-heading)] tracking-[-0.03em] text-r5-text-primary">
        {headline}
      </p>
      <p className="mt-[var(--r5-space-2)] max-w-[42ch] text-[length:var(--r5-font-body)] leading-[var(--r5-leading-body)] text-r5-text-secondary">
        {personalSub}
      </p>
    </header>
  );
}
