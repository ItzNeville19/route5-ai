"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useReducedMotion } from "framer-motion";
import { type WorkspaceInsightContext } from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";
import { hourInTimezone, formatClockInTimezone } from "@/lib/timezone-date";
import { stableHash } from "@/lib/stable-hash";
import { getDisplayLocationLabel } from "@/lib/workspace-regions";

/** Time-aware headline + local time and a short, practical tip — no marketing taglines. */
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
  const [headline, setHeadline] = useState("");
  const [personalSub, setPersonalSub] = useState("");

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

  useEffect(() => {
    void minuteClockTick;
    const hour = hourInTimezone(effectiveIana);
    const phase =
      hour < 5 ? "early" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "late";

    const headlinePoolByPhase: Record<typeof phase, string[]> = {
      early: [`Hi, ${first}`, `Good morning, ${first}`, `${first} — early start`],
      morning: [`Good morning, ${first}`, `Hi ${first}`, `${first} — good morning`],
      afternoon: [`Good afternoon, ${first}`, `Hi ${first}`, `${first} — good afternoon`],
      evening: [`Good evening, ${first}`, `Hi ${first}`, `${first} — good evening`],
      late: [`Hi, ${first}`, `Welcome back, ${first}`, `${first} — still here`],
    };
    const base = headlinePoolByPhase[phase];
    const hSeed = stableHash(`${user?.id ?? "anon"}:${phase}:${new Date().toISOString().slice(0, 10)}`);
    let picked = base[hSeed % base.length] ?? base[0] ?? `Hi ${first}`;
    try {
      const key = "route5:feed-greeting-history:v1";
      const raw = localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      if (arr.includes(picked)) {
        const alt = base.find((x) => !arr.includes(x));
        if (alt) picked = alt;
      }
      localStorage.setItem(key, JSON.stringify([picked, ...arr].slice(0, 24)));
    } catch {
      /* ignore */
    }
    setHeadline(picked);

    const clock = formatClockInTimezone(effectiveIana, intlLocale);
    const place = getDisplayLocationLabel(effectiveIana, exp.prefs.workspaceRegionKey);
    const prefix = place ? `It's ${clock} in ${place}.` : `It's ${clock}.`;
    const openActions = summary.openActions.length;
    const staleActions = summary.execution.staleOpenActions;
    const completionRate = summary.execution.actionCompletionRate;

    let tip = "";
    if (staleActions > 0) {
      tip = `Clear ${staleActions} stale action${staleActions === 1 ? "" : "s"} first.`;
    } else if (openActions > 0) {
      tip = `Confirm owner and due date on ${openActions} open action${openActions === 1 ? "" : "s"}.`;
    } else if (completionRate != null && completionRate >= 0.8) {
      tip = "Strong week on follow-through.";
    } else if (insightCtx.projectCount > 0) {
      tip = `You have ${insightCtx.projectCount} active project${insightCtx.projectCount === 1 ? "" : "s"}.`;
    } else {
      tip = "Add a project when you're ready.";
    }

    setPersonalSub(`${prefix} ${tip}`);
  }, [
    minuteClockTick,
    effectiveIana,
    first,
    insightCtx.extractionCount,
    insightCtx.projectCount,
    intlLocale,
    exp.prefs.workspaceRegionKey,
    summary.openActions.length,
    summary.execution.staleOpenActions,
    summary.execution.actionCompletionRate,
    user?.id,
  ]);

  const linePulse =
    loadingSummary && !reduceMotion
      ? "motion-safe:animate-pulse motion-reduce:animate-none opacity-90"
      : "";

  return (
    <header className="mb-[var(--r5-space-4)]">
      <p
        className={`text-[clamp(1.05rem,2.4vw,1.25rem)] font-[var(--r5-font-weight-semibold)] leading-[var(--r5-leading-heading)] tracking-[-0.03em] text-r5-text-primary ${linePulse}`}
      >
        {headline}
      </p>
      <p
        className={`mt-[var(--r5-space-2)] truncate whitespace-nowrap text-[length:var(--r5-font-body)] leading-[var(--r5-leading-body)] text-r5-text-secondary ${linePulse}`}
        title={personalSub}
      >
        {personalSub}
      </p>
    </header>
  );
}
