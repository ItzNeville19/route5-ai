import type { OrgCommitmentPriority, OrgCommitmentStatus } from "@/lib/org-commitment-types";

export const ORG_STATUS_LABEL: Record<OrgCommitmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_track: "On track",
  at_risk: "At risk",
  overdue: "Overdue",
  completed: "Completed",
};

/** High-contrast pills (readable on light canvas — Reminders-style, not tinted-on-tinted). */
export const ORG_STATUS_PILL: Record<OrgCommitmentStatus, string> = {
  not_started: "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300/90",
  in_progress: "bg-blue-50 text-blue-900 ring-1 ring-blue-200",
  on_track: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  at_risk: "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
  overdue: "bg-red-50 text-red-900 ring-1 ring-red-200",
  completed: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-300/90",
};

export const ORG_PRIORITY_LABEL: Record<OrgCommitmentPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ORG_PRIORITY_PILL: Record<OrgCommitmentPriority, string> = {
  critical: "bg-red-50 text-red-900 ring-1 ring-red-200",
  high: "bg-orange-50 text-orange-950 ring-1 ring-orange-200",
  medium: "bg-sky-50 text-sky-950 ring-1 ring-sky-200",
  low: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300/90",
};
