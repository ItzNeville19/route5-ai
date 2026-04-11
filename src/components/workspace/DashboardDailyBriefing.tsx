"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Orbit } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  computeDailyBriefing,
  syncBriefingSnapshot,
  type YesterdaySnap,
} from "@/lib/daily-briefing";

type Props = {
  displayName: string;
  projectCount: number;
  extractionCount: number;
  liveConnectorCount: number | null;
  readiness: {
    openai: boolean;
    linear: boolean;
    github: boolean;
  } | null;
  summaryLoading: boolean;
};

export default function DashboardDailyBriefing({
  displayName,
  projectCount,
  extractionCount,
  liveConnectorCount,
  readiness,
  summaryLoading,
}: Props) {
  const exp = useWorkspaceExperience();
  const tz = exp.prefs.workspaceTimezone;
  const [prior, setPrior] = useState<YesterdaySnap | null>(null);

  useEffect(() => {
    if (summaryLoading) return;
    setPrior(syncBriefingSnapshot({ projectCount, extractionCount }, tz));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryLoading]);

  const briefing = useMemo(
    () =>
      computeDailyBriefing({
        displayName,
        projectCount,
        extractionCount,
        liveConnectorCount,
        readiness,
        priorSnapshot: prior,
        timezone: tz,
      }),
    [displayName, projectCount, extractionCount, liveConnectorCount, readiness, prior, tz]
  );

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/95 shadow-[0_20px_64px_-34px_rgba(99,102,241,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md dark:shadow-[0_24px_72px_-32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]"
      aria-labelledby="daily-brief-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background:radial-gradient(120%_80%_at_0%_0%,rgba(99,102,241,0.1),transparent_52%),radial-gradient(100%_60%_at_100%_100%,rgba(168,85,247,0.06),transparent_48%)]"
        aria-hidden
      />
      <div className="relative px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/90 text-[var(--workspace-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <Orbit className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--workspace-muted-fg)]">
                Today
              </p>
              <h2
                id="daily-brief-heading"
                className="mt-1 text-[clamp(1.05rem,2.5vw,1.2rem)] font-semibold leading-snug tracking-[-0.02em] text-[var(--workspace-fg)]"
              >
                {briefing.headline}
              </h2>
              <p className="mt-1.5 text-[12px] font-medium tabular-nums text-[var(--workspace-muted-fg)] sm:text-[13px]">
                {briefing.subline}
              </p>
            </div>
          </div>
          <Link
            href="/workspace/apps"
            className="inline-flex shrink-0 items-center gap-2 self-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-3 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-surface)] sm:self-start"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-[var(--workspace-accent)]" strokeWidth={2} aria-hidden />
            App launcher
          </Link>
        </div>
        <ul className="mt-4 space-y-2 border-t border-[var(--workspace-border)]/80 pt-4">
          {briefing.bullets.map((b, i) => (
            <li
              key={`${i}-${b.slice(0, 12)}`}
              className="flex gap-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--workspace-accent)] shadow-[0_0_8px_rgba(99,102,241,0.45)]" />
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-[var(--workspace-muted-fg)] opacity-90">
          Counts update as you work. Headlines rotate once per calendar day.
        </p>
      </div>
    </section>
  );
}
