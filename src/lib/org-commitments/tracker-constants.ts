import type { OrgCommitmentPriority, OrgCommitmentStatus } from "@/lib/org-commitment-types";

export const ORG_STATUS_LABEL: Record<OrgCommitmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_track: "On track",
  at_risk: "At risk",
  overdue: "Overdue",
  completed: "Completed",
};

export const ORG_STATUS_PILL: Record<OrgCommitmentStatus, string> = {
  not_started: "border border-zinc-400/30 bg-zinc-500/15 text-[var(--workspace-fg)]",
  in_progress: "border border-sky-400/35 bg-sky-500/15 text-[var(--workspace-fg)]",
  on_track: "border border-emerald-400/35 bg-emerald-500/15 text-[var(--workspace-fg)]",
  at_risk: "border border-amber-400/35 bg-amber-500/15 text-[var(--workspace-fg)]",
  overdue: "border border-red-400/35 bg-red-500/15 text-[var(--workspace-fg)]",
  completed: "border border-emerald-400/35 bg-emerald-500/15 text-[var(--workspace-fg)]",
};

export const ORG_PRIORITY_LABEL: Record<OrgCommitmentPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ORG_PRIORITY_PILL: Record<OrgCommitmentPriority, string> = {
  critical: "border border-red-400/35 bg-red-500/20 text-[var(--workspace-fg)]",
  high: "border border-orange-400/35 bg-orange-500/15 text-[var(--workspace-fg)]",
  medium: "border border-sky-400/35 bg-sky-500/15 text-[var(--workspace-fg)]",
  low: "border border-zinc-400/25 bg-zinc-500/15 text-[var(--workspace-fg)]",
};
