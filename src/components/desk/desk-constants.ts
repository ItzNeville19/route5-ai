import type { CommitmentStatus } from "@/lib/commitment-types";

/** Pill / badge chrome */
export const STATUS_PILL: Record<CommitmentStatus, string> = {
  active: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  at_risk: "bg-amber-500/20 text-amber-100 border-amber-400/35",
  overdue: "bg-red-500/20 text-red-100 border-red-400/35",
  completed: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
};

/** Left accent on list cards */
export const STATUS_ACCENT: Record<CommitmentStatus, string> = {
  active: "border-l-sky-400",
  at_risk: "border-l-amber-400",
  overdue: "border-l-red-400",
  completed: "border-l-emerald-400",
};

export const STATUS_LABEL: Record<CommitmentStatus, string> = {
  active: "Active",
  at_risk: "At risk",
  overdue: "Overdue",
  completed: "Done",
};
