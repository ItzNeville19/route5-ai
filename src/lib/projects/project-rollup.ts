import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { isCompletedRow } from "@/lib/feed/group-commitments";

export type ProjectRollup = {
  commitmentCount: number;
  overdue: number;
  atRisk: number;
  onTrack: number;
  lastUpdated: string | null;
};

/** Single source of truth for project cards and hub rollups (aligned with `/api/commitments` rows). */
export function rollupCommitmentsByProject(commitments: OrgCommitmentRow[]): Map<string, ProjectRollup> {
  const map = new Map<string, ProjectRollup>();
  for (const row of commitments) {
    const pid = row.projectId;
    if (!pid) continue;
    const current = map.get(pid) ?? {
      commitmentCount: 0,
      overdue: 0,
      atRisk: 0,
      onTrack: 0,
      lastUpdated: null,
    };
    current.commitmentCount += 1;
    if (!isCompletedRow(row)) {
      if (row.status === "overdue") current.overdue += 1;
      else if (row.status === "at_risk") current.atRisk += 1;
      else current.onTrack += 1;
    }
    if (!current.lastUpdated || new Date(row.updatedAt).getTime() > new Date(current.lastUpdated).getTime()) {
      current.lastUpdated = row.updatedAt;
    }
    map.set(pid, current);
  }
  return map;
}

export function projectHealthScore(rollup: ProjectRollup): number {
  const open = rollup.overdue + rollup.atRisk + rollup.onTrack;
  if (open <= 0) return 100;
  const weighted = rollup.overdue * 16 + rollup.atRisk * 9 + rollup.onTrack * 2;
  const score = 100 - Math.round(weighted / Math.max(open, 1));
  return Math.max(0, Math.min(100, score));
}
