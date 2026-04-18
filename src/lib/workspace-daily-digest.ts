import { formatRelativeLong } from "@/lib/relative-time";
import type { ExecutionOverview } from "@/lib/commitment-types";
import type { WorkspaceExecutionMetrics } from "@/lib/workspace-activity-stats";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

/** Summary fields needed to render the daily digest (popover + full page). */
export type DailyDigestSummarySlice = {
  projectCount: number;
  extractionCount: number;
  execution: WorkspaceExecutionMetrics;
  recent: RecentExtractionRow[];
};

export type DailyDigestListItem = {
  title: string;
  body: string;
  href?: string;
  tone?: "warn";
};

export function formatDigestDateLine(intlLocale: string, workspaceTimezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
  };
  const tz = workspaceTimezone?.trim();
  if (tz) {
    try {
      return new Date().toLocaleDateString(intlLocale, { ...opts, timeZone: tz });
    } catch {
      /* invalid tz */
    }
  }
  return new Date().toLocaleDateString(intlLocale, opts);
}

/**
 * Shared digest blocks for the header popover and `/workspace/digest`.
 * Uses live workspace summary data only — no fabricated metrics.
 */
export function buildDailyDigestListItems(input: {
  loadingSummary: boolean;
  summary: DailyDigestSummarySlice | null;
  /** Commitment engine snapshot — overdue / at risk / unowned. */
  executionOverview?: ExecutionOverview | null;
  intlLocale: string;
  workspaceTimezone?: string;
}): DailyDigestListItem[] {
  const { loadingSummary, summary, executionOverview, intlLocale, workspaceTimezone } = input;
  const today = formatDigestDateLine(intlLocale, workspaceTimezone);
  const items: DailyDigestListItem[] = [
    {
      title: `Daily digest · ${today}`,
      body: "Counts and activity below come from your workspace database — refreshed when you load the app.",
    },
  ];

  if (loadingSummary || !summary) return items;

  const { projectCount, extractionCount, execution, recent } = summary;
  const stale = execution.staleOpenActions;

  items.push({
    title: "Execution snapshot",
    body: `${extractionCount} total runs · ${projectCount} project${projectCount === 1 ? "" : "s"} · ${execution.actionItemsCompleted}/${execution.actionItemsTotal || 0} actions checked off`,
    href: "/overview",
  });

  if (executionOverview) {
    const s = executionOverview.summary;
    items.push({
      title: "Commitment accountability",
      body: `${s.activeTotal} open commitments · ${s.overdueCount} overdue · ${s.atRiskCount} at risk · ${s.unassignedCount} without owner`,
      href: "/overview",
    });
    if (s.overdueCount > 0 || s.atRiskCount > 0 || s.unassignedCount > 0) {
      items.push({
        title: "Escalation signals",
        body: "Review commitments on Desk — statuses reconcile from due dates and seven-day inactivity.",
        href: "/desk",
        tone: "warn",
      });
    }
  }

  if (stale > 0) {
    items.push({
      title: "Needs attention",
      body: `${stale} open action${stale === 1 ? "" : "s"} on runs older than 7 days (UTC). Review in projects.`,
      href: "/overview",
      tone: "warn",
    });
  }

  if (recent[0]) {
    const r = recent[0];
    const when = formatRelativeLong(r.createdAt, intlLocale);
    items.push({
      title: "Latest run",
      body: `${when} · ${r.projectName}: ${r.summarySnippet.slice(0, 120)}${r.summarySnippet.length > 120 ? "…" : ""}`,
      href: `/projects/${r.projectId}#extractions-section`,
    });
  }

  return items;
}
