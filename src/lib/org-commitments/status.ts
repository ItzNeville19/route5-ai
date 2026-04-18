import type { OrgCommitmentStatus } from "@/lib/org-commitment-types";

/**
 * Automatic status rules (keep in sync with public.recompute_org_commitment_status in 006_commitments.sql).
 */
export function computeAutomaticOrgCommitmentStatus(input: {
  deadline: string;
  lastActivityAt: string;
  completedAt: string | null;
}): Exclude<OrgCommitmentStatus, "not_started"> {
  const now = Date.now();
  const deadline = new Date(input.deadline).getTime();
  const lastAct = new Date(input.lastActivityAt).getTime();

  if (input.completedAt) return "completed";
  if (deadline < now) return "overdue";
  const ms72h = 72 * 3600 * 1000;
  const ms48h = 48 * 3600 * 1000;
  const ms7d = 7 * 24 * 3600 * 1000;
  if (deadline <= now + ms72h && lastAct < now - ms48h) return "at_risk";
  if (deadline > now + ms7d) return "on_track";
  return "in_progress";
}
