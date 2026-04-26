/**
 * Deep links for commitment execution now resolve to Desk only.
 * Commitment filtering is a view over one canonical dataset.
 */

import { deskUrl } from "@/lib/desk-routes";

export const ORG_COMMITMENTS = "/desk";

/** Commitment tracker is Desk with optional filter. */
export function orgCommitmentsHref(status?: string): string {
  const base = deskUrl();
  if (!status) return base;
  const u = new URL(base, "https://route5.local");
  if (status === "my") u.searchParams.set("filter", "my_work");
  else if (status === "overdue") u.searchParams.set("filter", "overdue");
  else if (status === "at_risk" || status === "unassigned") u.searchParams.set("filter", "at_risk");
  else u.searchParams.set("filter", "all");
  return `${u.pathname}${u.search}`;
}

/** Desk with `filter=` for triage modes that map to desk tabs (requires a project selection on Desk). */
export function deskFilteredHref(filter: "unassigned" | "overdue" | "at_risk" | "my" | "history"): string {
  const base = deskUrl();
  const u = new URL(base, "https://route5.local");
  const normalized =
    filter === "my" ? "my_work" : filter === "history" ? "all" : filter;
  u.searchParams.set("filter", normalized);
  return `${u.pathname}${u.search}`;
}

/** Desk filter query values (matches CommitmentDesk /api filter chips). */
export type DeskFilterParam = "open" | "my" | "at_risk" | "overdue" | "unassigned" | "history";

export function deskHrefWithProjectFilter(projectId: string | undefined, filter: DeskFilterParam): string {
  const base = deskUrl(projectId ? { projectId } : {});
  const u = new URL(base, "https://route5.local");
  if (filter !== "open") {
    const normalized =
      filter === "my" ? "my_work" : filter === "history" ? "all" : filter;
    u.searchParams.set("filter", normalized);
  }
  else u.searchParams.delete("filter");
  return `${u.pathname}${u.search}`;
}

/** When no project exists yet, send users to org tracker instead of empty desk filters. */
export function executionMetricFallbackHrefs(): {
  active: string;
  overdue: string;
  atRisk: string;
  unassigned: string;
  weekClosed: string;
} {
  return {
    active: deskUrl(),
    overdue: orgCommitmentsHref("overdue"),
    atRisk: orgCommitmentsHref("at_risk"),
    unassigned: orgCommitmentsHref("unassigned"),
    weekClosed: deskUrl(),
  };
}
