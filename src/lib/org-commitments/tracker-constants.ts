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
  not_started: "bg-zinc-500/20 text-zinc-100 border-zinc-400/30",
  in_progress: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  on_track: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
  at_risk: "bg-amber-500/20 text-amber-100 border-amber-400/35",
  overdue: "bg-red-500/20 text-red-100 border-red-400/35",
  completed: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
};

export const ORG_PRIORITY_LABEL: Record<OrgCommitmentPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ORG_PRIORITY_PILL: Record<OrgCommitmentPriority, string> = {
  critical: "bg-red-500/25 text-red-100 border-red-400/35",
  high: "bg-orange-500/20 text-orange-100 border-orange-400/30",
  medium: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  low: "bg-zinc-500/20 text-zinc-100 border-zinc-400/25",
};
