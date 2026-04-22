import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";

/**
 * Shared org-level execution health score used across leadership views.
 * Higher is healthier. Only open commitments contribute.
 */
export function computeWorkspaceExecutionHealth(rows: OrgCommitmentRow[]): number {
  const open = rows.filter((r) => !isCompletedRow(r));
  if (open.length === 0) return 100;
  let score = 100;
  for (const row of open) {
    if (row.status === "overdue") score -= 10;
    else if (row.status === "at_risk") score -= 5;
    else score -= 1;
  }
  return Math.max(0, Math.round(score));
}
