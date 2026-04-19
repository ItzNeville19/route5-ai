"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useReducedMotion } from "framer-motion";
import {
  type WorkspaceInsightContext,
} from "@/lib/workspace-welcome";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";
import { hourInTimezone, formatClockInTimezone } from "@/lib/timezone-date";
import { stableHash } from "@/lib/stable-hash";
import { getDisplayLocationLabel } from "@/lib/workspace-regions";

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
    const themeTone =
      exp.prefs.appearanceTheme === "morning"
        ? "morning"
        : exp.prefs.appearanceTheme === "sunrise"
          ? "warm"
          : exp.prefs.appearanceTheme === "sunset"
            ? "sunset"
            : exp.prefs.appearanceTheme === "forest"
              ? "steady"
              : exp.prefs.appearanceTheme === "cosmic"
                ? "cosmic"
                : exp.prefs.appearanceTheme === "oled"
                  ? "focused"
                  : "classic";
    const phase =
      hour < 5 ? "early" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "late";

    const headlinePoolByPhase: Record<typeof phase, string[]> = {
      early: [
        `${first}, early focus`,
        `${first}, quiet start`,
        `${first}, first move`,
        `${first}, before the rush`,
      ],
      morning: [
        `Good morning, ${first}`,
        `${first}, ready to execute`,
        `${first}, let's lock priorities`,
        `${first}, momentum starts here`,
      ],
      afternoon: [
        `Good afternoon, ${first}`,
        `${first}, keep the pace`,
        `${first}, execution check-in`,
        `${first}, tighten the lane`,
      ],
      evening: [`Good evening, ${first}`, `${first}, final push`, `${first}, close strong`, `${first}, execution lane`],
      late: [
        `Welcome back, ${first}`,
        `${first}, late session mode`,
        `${first}, continue where you left off`,
        `${first}, clean closeout`,
      ],
    };
    const themeFlavor: Record<string, string[]> = {
      morning: ["with calm clarity", "on a fresh lane"],
      warm: ["with warm momentum", "on a high-energy lane"],
      sunset: ["through the sunset stretch", "for a smooth closeout"],
      steady: ["with steady pressure", "with clear signals"],
      cosmic: ["on a deep-focus lane", "through the signal layer"],
      focused: ["in precision mode", "with no-noise focus"],
      classic: ["on your command lane", "with sharp execution focus"],
    };
    const base = headlinePoolByPhase[phase];
    const mixed = [...base.map((line, i) => `${line} ${themeFlavor[themeTone][i % themeFlavor[themeTone].length]}`)];
    const hSeed = stableHash(`${user?.id ?? "anon"}:${phase}:${themeTone}:${new Date().toISOString().slice(0, 10)}`);
    let picked = mixed[hSeed % mixed.length] ?? mixed[0] ?? `Hi ${first}`;
    try {
      const key = "route5:feed-greeting-history:v1";
      const raw = localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      if (arr.includes(picked)) {
        const alt = mixed.find((x) => !arr.includes(x));
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
      tip = "Great pace. Keep new commitments tightly scoped.";
    } else if (insightCtx.projectCount > 0) {
      tip = `Focus on your top ${Math.min(3, insightCtx.projectCount)} active project${insightCtx.projectCount === 1 ? "" : "s"}.`;
    } else {
      tip = "Capture one clear decision to start momentum.";
    }

    setPersonalSub(`${prefix} ${tip}`);
  }, [
    minuteClockTick,
    effectiveIana,
    exp.prefs.appearanceTheme,
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

  const pulseClass =
    loadingSummary && !reduceMotion ? "motion-safe:animate-pulse motion-reduce:animate-none" : "";

  return (
    <header className={`mb-[var(--r5-space-4)] ${pulseClass}`}>
      <p className="text-[clamp(1.05rem,2.4vw,1.25rem)] font-[var(--r5-font-weight-semibold)] leading-[var(--r5-leading-heading)] tracking-[-0.03em] text-r5-text-primary">
        {headline}
      </p>
      <p
        className="mt-[var(--r5-space-2)] truncate whitespace-nowrap text-[length:var(--r5-font-body)] leading-[var(--r5-leading-body)] text-r5-text-secondary"
        title={personalSub}
      >
        {personalSub}
      </p>
    </header>
  );
}
