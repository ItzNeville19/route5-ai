"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronRight,
  Search,
} from "lucide-react";
import type {
  ActivitySeriesByRange,
  RecentExtractionRow,
  WorkspaceActivityStats,
  WorkspaceConnectorReadiness,
  WorkspaceExecutionMetrics,
} from "@/lib/workspace-summary";
import {
  getHeroHeadline,
  getOverviewPersonalSubline,
  type WorkspaceInsightContext,
} from "@/lib/workspace-welcome";
import { useCommandPalette } from "@/components/CommandPalette";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";
import { isLightWorkspacePalette, resolveWorkspaceTheme } from "@/lib/workspace-themes";
import DashboardTodayPanel from "@/components/workspace/DashboardTodayPanel";
import EnterpriseIntelChartModal from "@/components/workspace/EnterpriseIntelChartModal";
import { formatPlanCap } from "@/lib/plan-usage-display";

type Props = {
  displayName: string;
  userId: string | undefined;
  workspaceTimezone?: string;
  workspaceRegionKey?: string;
  summaryLoading: boolean;
  projectCount: number;
  extractionCount: number;
  readiness: WorkspaceConnectorReadiness | null;
  onboardingComplete: boolean;
  recent: RecentExtractionRow[];
  activity: WorkspaceActivityStats;
  activitySeries: ActivitySeriesByRange;
  execution: WorkspaceExecutionMetrics;
};

function weekOverWeekLabel(a: WorkspaceActivityStats): string | null {
  const { weekOverWeekPercent: w, prior7DaysCount: prior } = a;
  if (w === null) return null;
  if (prior === 0) return null;
  return `${w >= 0 ? "+" : ""}${w.toFixed(1)}% vs prior week`;
}

function integrationCountLive(readiness: WorkspaceConnectorReadiness | null): number | null {
  if (!readiness) return null;
  return [readiness.openai, readiness.linear, readiness.github, readiness.figma].filter(Boolean).length;
}

export default function DashboardWorkspaceHero({
  displayName,
  userId,
  workspaceTimezone,
  workspaceRegionKey,
  summaryLoading,
  projectCount,
  extractionCount,
  readiness,
  onboardingComplete,
  recent,
  activity,
  activitySeries,
  execution,
}: Props) {
  const { open: openPalette } = useCommandPalette();
  const { entitlements, loadingEntitlements } = useWorkspaceData();
  const { prefs } = useWorkspaceExperience();
  const { intlLocale } = useI18n();
  const minuteClockTick = useAlignedMinuteTick();
  const heroLight = useMemo(
    () =>
      isLightWorkspacePalette(
        resolveWorkspaceTheme(prefs, minuteClockTick).resolvedId
      ),
    [prefs, minuteClockTick]
  );
  const reduceMotion = useReducedMotion();
  const paidTierMotion =
    !loadingEntitlements && (entitlements?.isPaidTier ?? false) && !reduceMotion;
  const advancedAnalytics = entitlements?.features.advancedAnalytics ?? false;
  const [chartModalOpen, setChartModalOpen] = useState(false);

  const first = displayName.trim().split(/\s+/)[0] || "there";

  const effectiveIana = useMemo(
    () => workspaceTimezone?.trim() || getBrowserIanaTimezone(),
    [workspaceTimezone]
  );

  const insightCtx = useMemo<WorkspaceInsightContext>(
    () => ({
      projectCount,
      extractionCount,
      readiness,
      latestExtraction: recent[0] ?? undefined,
    }),
    [projectCount, extractionCount, readiness, recent]
  );

  const headline = useMemo(() => {
    void minuteClockTick;
    return getHeroHeadline(first, userId, effectiveIana);
  }, [first, userId, effectiveIana, minuteClockTick]);

  const personalSub = useMemo(() => {
    void minuteClockTick;
    return getOverviewPersonalSubline(
      insightCtx,
      userId,
      effectiveIana,
      workspaceRegionKey,
      intlLocale
    );
  }, [insightCtx, userId, effectiveIana, workspaceRegionKey, intlLocale, minuteClockTick]);

  const dateLine = useMemo(() => {
    void minuteClockTick;
    const tz = effectiveIana?.trim();
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "short",
      day: "numeric",
    };
    if (tz) {
      try {
        return new Date().toLocaleDateString(intlLocale, { ...opts, timeZone: tz });
      } catch {
        /* fall through */
      }
    }
    return new Date().toLocaleDateString(intlLocale, opts);
  }, [effectiveIana, intlLocale, minuteClockTick]);

  const wowText = useMemo(() => weekOverWeekLabel(activity), [activity]);
  const latest = recent[0];

  const planUsageLine = useMemo(() => {
    if (loadingEntitlements || !entitlements?.limits || !entitlements.usage) return null;
    const { limits, usage } = entitlements;
    return `${usage.extractionsThisMonth.toLocaleString()} / ${formatPlanCap(limits.maxExtractionsPerMonth)} runs this month · ${usage.projectCount.toLocaleString()} / ${formatPlanCap(limits.maxProjects)} projects`;
  }, [loadingEntitlements, entitlements]);

  return (
    <div className="space-y-5">
      <EnterpriseIntelChartModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        activitySeries={activitySeries}
        execution={execution}
        extractionCount={extractionCount}
      />

      <section
        className={
          heroLight
            ? "workspace-depth-root workspace-liquid-glass liquid-glass-shimmer relative overflow-hidden rounded-[28px] border border-[var(--workspace-border)] text-[var(--workspace-fg)] shadow-[0_40px_100px_-48px_rgba(91,33,182,0.14)]"
            : "workspace-depth-root workspace-liquid-glass liquid-glass-shimmer relative overflow-hidden rounded-[28px] border border-white/12 text-white shadow-[0_40px_100px_-48px_rgba(91,33,182,0.55)]"
        }
      >
        <div className="pointer-events-none absolute inset-0">
          {heroLight ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(139,92,246,0.14),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(91,33,182,0.08),transparent_50%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--workspace-canvas)]/95 via-[var(--workspace-surface)]/92 to-[var(--workspace-canvas)]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(139,92,246,0.35),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(91,33,182,0.2),transparent_50%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-zinc-950/98 to-[#050506]" />
            </>
          )}
        </div>

        <div className="relative z-[1] flex flex-col px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={
                    heroLight
                      ? "text-[11px] font-medium tracking-wide text-[var(--workspace-muted-fg)]"
                      : "text-[11px] font-medium tracking-wide text-white/82"
                  }
                >
                  {dateLine}
                </p>
                <Link
                  href="/workspace/digest"
                  className={
                    heroLight
                      ? "inline-flex items-center gap-1 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)] transition hover:border-[var(--workspace-border)] hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
                      : "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/20 hover:text-white"
                  }
                >
                  <Bell className="h-3 w-3" aria-hidden />
                  Daily digest
                </Link>
                <Link
                  href="/account/plans"
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    heroLight
                      ? !loadingEntitlements && entitlements?.isPaidTier
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 hover:border-emerald-600/50"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-950 hover:border-amber-600/50"
                      : !loadingEntitlements && entitlements?.isPaidTier
                        ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/50"
                        : "border-amber-400/35 bg-amber-500/15 text-amber-100 hover:border-amber-300/50"
                  }`}
                >
                  {loadingEntitlements ? "Plan…" : entitlements?.tierLabel ?? "Free"}
                </Link>
              </div>
              {planUsageLine ? (
                <p
                  className={
                    heroLight
                      ? "mt-2 text-[11px] leading-snug text-[var(--workspace-muted-fg)]"
                      : "mt-2 text-[11px] leading-snug text-white/65"
                  }
                >
                  {planUsageLine}
                </p>
              ) : null}
              <h1
                className={
                  heroLight
                    ? "mt-3 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.04em] text-[var(--workspace-fg)] sm:text-[2.15rem]"
                    : "mt-3 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white sm:text-[2.15rem]"
                }
              >
                {headline}
              </h1>
              <p
                className={
                  heroLight
                    ? "mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]"
                    : "mt-3 max-w-2xl text-[14px] leading-relaxed text-white/90"
                }
              >
                {personalSub}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p
              className={
                heroLight
                  ? "text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
                  : "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80"
              }
            >
              Total runs
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              {paidTierMotion && !summaryLoading ? (
                <motion.span
                  key={extractionCount}
                  initial={{ opacity: 0.35, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className={
                    heroLight
                      ? "text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--workspace-fg)] tabular-nums sm:text-[3rem]"
                      : "text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-white tabular-nums sm:text-[3rem]"
                  }
                >
                  {extractionCount}
                </motion.span>
              ) : (
                <span
                  className={
                    heroLight
                      ? "text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--workspace-fg)] tabular-nums sm:text-[3rem]"
                      : "text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-white tabular-nums sm:text-[3rem]"
                  }
                >
                  {summaryLoading ? "—" : extractionCount}
                </span>
              )}
              {!summaryLoading && wowText ? (
                <span
                  className={
                    heroLight
                      ? "rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-900"
                      : "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                  }
                >
                  {wowText}
                </span>
              ) : null}
            </div>
            <p
              className={
                heroLight
                  ? "mt-2 text-[13px] text-[var(--workspace-muted-fg)]"
                  : "mt-2 text-[13px] text-white/78"
              }
            >
              {summaryLoading ? (
                "—"
              ) : (
                <>
                  <span
                    className={heroLight ? "text-[var(--workspace-fg)]" : "text-white/85"}
                  >
                    {projectCount} project{projectCount === 1 ? "" : "s"}
                  </span>
                  <span
                    className={heroLight ? "text-[var(--workspace-muted-fg)]/70" : "text-white/45"}
                  >
                    {" "}
                    ·{" "}
                  </span>
                  <span
                    className={heroLight ? "text-[var(--workspace-fg)]" : "text-white/85"}
                    title="OpenAI, Linear, GitHub, Figma — each can be connected under Integrations."
                  >
                    {readiness == null
                      ? "—"
                      : `${integrationCountLive(readiness)} of 4 integrations connected`}
                  </span>
                  {" · "}
                  <Link
                    href="/integrations"
                    className={
                      heroLight
                        ? "font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline"
                        : "font-medium text-violet-200 underline-offset-2 hover:text-white hover:underline"
                    }
                  >
                    Integrations
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-zinc-950 shadow-lg shadow-black/25 transition hover:bg-zinc-100"
            >
              New project
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <Link
              href="/desk"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-zinc-950 shadow-md transition hover:bg-zinc-100"
            >
              Desk
              <ArrowDownRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setChartModalOpen(true)}
              title={
                advancedAnalytics
                  ? "Workspace analytics"
                  : "Upgrade to Pro for advanced analytics and full exports"
              }
              className={
                heroLight
                  ? "relative inline-flex h-11 items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                  : "relative inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-medium text-white transition hover:bg-white/10"
              }
            >
              <BarChart3
                className={
                  heroLight ? "h-4 w-4 text-[var(--workspace-muted-fg)]" : "h-4 w-4 text-white/85"
                }
                aria-hidden
              />
              Analytics
              {!loadingEntitlements && !advancedAnalytics ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-zinc-950">
                  Pro
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => openPalette()}
              className={
                heroLight
                  ? "inline-flex h-11 items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-transparent px-4 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                  : "inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-transparent px-4 text-[13px] font-medium text-white/95 transition hover:bg-white/[0.06]"
              }
            >
              <Search
                className={
                  heroLight ? "h-4 w-4 text-[var(--workspace-muted-fg)]" : "h-4 w-4 text-white/80"
                }
                aria-hidden
              />
              Search
              <kbd
                className={
                  heroLight
                    ? "rounded border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--workspace-muted-fg)]"
                    : "rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-mono text-[9px] text-white/75"
                }
              >
                ⌘K
              </kbd>
            </button>
          </div>

          {!summaryLoading && !latest && projectCount > 0 && extractionCount === 0 ? (
            <Link
              href="/desk"
              className={
                heroLight
                  ? "mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
                  : "mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-violet-200 hover:text-white"
              }
            >
              Run your first capture on Desk
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}

          <div
            className={
              heroLight
                ? "mt-8 space-y-6 border-t border-[var(--workspace-border)] pt-6"
                : "mt-8 space-y-6 border-t border-white/10 pt-6"
            }
          >
            <DashboardTodayPanel
              projectCount={projectCount}
              extractionCount={extractionCount}
              readiness={readiness}
              workspaceTimezone={effectiveIana}
              workspaceRegionKey={workspaceRegionKey}
              locale={intlLocale}
              latestExtraction={recent[0] ?? null}
              layout="default"
              surface={heroLight ? "default" : "darkHero"}
            />

            <div
              className={`flex flex-wrap items-center gap-3 pt-1 ${onboardingComplete ? "justify-end" : "justify-between"}`}
              aria-label="Workspace shortcuts"
            >
              {!onboardingComplete ? (
                <Link
                  href="/onboarding?replay=1"
                  className={
                    heroLight
                      ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-700 transition hover:text-lime-800"
                      : "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d9f99d] transition hover:text-[#ecfccb]"
                  }
                >
                  Get started
                </Link>
              ) : null}
              <div className="flex items-center gap-2.5">
                <Link
                  href="/workspace/customize"
                  className={
                    heroLight
                      ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
                      : "text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:text-white"
                  }
                >
                  Customize
                </Link>
                <span
                  className={
                    heroLight ? "text-[10px] text-[var(--workspace-muted-fg)]/50" : "text-[10px] text-white/40"
                  }
                  aria-hidden
                >
                  ·
                </span>
                <Link
                  href="/settings"
                  className={
                    heroLight
                      ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
                      : "text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:text-white"
                  }
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
