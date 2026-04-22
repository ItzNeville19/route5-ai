/**
 * Deep links from dashboard metric tiles → org commitments tracker (`/workspace/commitments`)
 * or Desk (`/desk`) when filters are project-scoped (e.g. no owner).
 */

import { deskUrl } from "@/lib/desk-routes";

export const ORG_COMMITMENTS = "/workspace/commitments";

/** Org-wide tracker; optional API `status` (matches OrgCommitmentTracker). */
export function orgCommitmentsHref(status?: string): string {
  if (!status) return ORG_COMMITMENTS;
  return `${ORG_COMMITMENTS}?status=${encodeURIComponent(status)}`;
}

/** Desk with `filter=` for triage modes that map to desk tabs (requires a project selection on Desk). */
export function deskFilteredHref(filter: "unassigned" | "overdue" | "at_risk" | "my" | "history"): string {
  const base = deskUrl();
  const u = new URL(base, "https://route5.local");
  u.searchParams.set("filter", filter);
  return `${u.pathname}${u.search}`;
}

/** Desk filter query values (matches CommitmentDesk /api filter chips). */
export type DeskFilterParam = "open" | "my" | "at_risk" | "overdue" | "unassigned" | "history";

export function deskHrefWithProjectFilter(projectId: string | undefined, filter: DeskFilterParam): string {
  const base = deskUrl(projectId ? { projectId } : {});
  const u = new URL(base, "https://route5.local");
  if (filter !== "open") u.searchParams.set("filter", filter);
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
    active: ORG_COMMITMENTS,
    overdue: orgCommitmentsHref("overdue"),
    atRisk: orgCommitmentsHref("at_risk"),
    unassigned: ORG_COMMITMENTS,
    weekClosed: orgCommitmentsHref("completed"),
  };
}
