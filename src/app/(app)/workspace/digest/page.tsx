"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, BarChart3, Bell, FolderOpen } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  buildDailyDigestListItems,
  formatDigestDateLine,
} from "@/lib/workspace-daily-digest";
import { digestFingerprint, markDigestFingerprintSeen } from "@/lib/workspace-digest-read";
import { deskUrl } from "@/lib/desk-routes";
import { formatRelativeLong } from "@/lib/relative-time";

function weekOverWeekLine(
  weekOverWeekPercent: number | null,
  prior7DaysCount: number
): string | null {
  if (weekOverWeekPercent === null) return null;
  if (prior7DaysCount === 0) return null;
  return `${weekOverWeekPercent >= 0 ? "+" : ""}${weekOverWeekPercent.toFixed(1)}% vs prior week`;
}

export default function WorkspaceDailyDigestPage() {
  const { user } = useUser();
  const userId = user?.id;
  const { intlLocale } = useI18n();
  const { prefs } = useWorkspaceExperience();
  const tz = prefs.workspaceTimezone?.trim();
  const { summary, executionOverview, loadingSummary } = useWorkspaceData();

  const dateHeading = useMemo(() => formatDigestDateLine(intlLocale, tz), [intlLocale, tz]);

  const digestBlocks = useMemo(
    () =>
      buildDailyDigestListItems({
        loadingSummary,
        summary,
        executionOverview,
        intlLocale,
        workspaceTimezone: tz,
      }),
    [loadingSummary, summary, executionOverview, intlLocale, tz]
  );

  const fingerprint = useMemo(() => {
    if (!summary) return "0:0:0:";
    const latestId = summary.recent[0]?.id ?? null;
    const ex = executionOverview?.summary;
    return digestFingerprint({
      projectCount: summary.projectCount,
      extractionCount: summary.extractionCount,
      staleOpenActions: summary.execution.staleOpenActions,
      latestExtractionId: latestId,
      commitmentOverdue: ex?.overdueCount,
      commitmentAtRisk: ex?.atRiskCount,
      commitmentUnassigned: ex?.unassignedCount,
    });
  }, [summary, executionOverview]);

  useEffect(() => {
    if (!userId || loadingSummary) return;
    if (fingerprint === "0:0:0:") return;
    markDigestFingerprintSeen(userId, fingerprint);
  }, [userId, fingerprint, loadingSummary]);

  const wow = summary ? weekOverWeekLine(summary.activity.weekOverWeekPercent, summary.activity.prior7DaysCount) : null;
  const recentPreview = summary?.recent.slice(0, 8) ?? [];

  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
          <Bell className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Daily digest
        </div>
        <h1 className="text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
          {dateHeading}
        </h1>
        <p className="max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          A snapshot of your workspace — same data as the bell menu in the header. Refreshes when you load
          the app.
        </p>
        {!loadingSummary && wow ? (
          <p className="text-[13px] font-medium text-[var(--workspace-success-fg)]">{wow} · rolling 7-day commitment activity</p>
        ) : null}
      </header>

      {loadingSummary ? (
        <p className="text-[14px] text-[var(--workspace-muted-fg)]">Loading workspace summary…</p>
      ) : null}

      <section className="space-y-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
          Highlights
        </h2>
        <div className="space-y-2">
          {digestBlocks.slice(1).map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className={`rounded-xl border border-[var(--workspace-border)] px-4 py-3 ${
                item.tone === "warn" ? "bg-amber-500/[0.06]" : "bg-[var(--workspace-surface)]/40"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                {item.title}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-1 block text-[14px] leading-snug text-[var(--workspace-fg)] transition hover:underline"
                >
                  {item.body}
                </Link>
              ) : (
                <p className="mt-1 text-[14px] leading-snug text-[var(--workspace-muted-fg)]">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {!loadingSummary && recentPreview.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
            Recent runs
          </h2>
          <ul className="space-y-2">
            {recentPreview.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/projects/${r.projectId}#extractions-section`}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/30 px-3 py-2.5 transition hover:border-[var(--workspace-accent)]/40 hover:bg-[var(--workspace-surface)]/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[var(--workspace-fg)]">{r.projectName}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--workspace-muted-fg)]">
                      {r.summarySnippet}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                      {formatRelativeLong(r.createdAt, intlLocale)}
                      {r.openActionsCount > 0 ? (
                        <span className="text-amber-300/90">
                          {" "}
                          · {r.openActionsCount} open action{r.openActionsCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--workspace-muted-fg)] transition group-hover:text-[var(--workspace-fg)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loadingSummary && summary && summary.extractionCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-surface)]/20 px-4 py-6 text-center">
          <p className="text-[14px] text-[var(--workspace-muted-fg)]">
            No runs yet. Capture something on Desk to start your digest.
          </p>
          <Link
            href={deskUrl()}
            className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--workspace-accent)] hover:underline"
          >
            Open Desk
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-[var(--workspace-border)] pt-6">
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-surface)]"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
          All projects
        </Link>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-surface)]"
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2} aria-hidden />
          Reports & analytics
        </Link>
      </div>
    </div>
  );
}
