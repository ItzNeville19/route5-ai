import type { CommitmentStatus } from "@/lib/commitment-types";

/** Pill chrome — tinted chip + workspace foreground so light AND dark palettes stay readable */
export const STATUS_PILL: Record<CommitmentStatus, string> = {
  active: "border border-sky-400/35 bg-sky-500/15 text-[var(--workspace-fg)]",
  at_risk: "border border-amber-400/35 bg-amber-500/15 text-[var(--workspace-fg)]",
  overdue: "border border-red-400/35 bg-red-500/15 text-[var(--workspace-fg)]",
  completed: "border border-emerald-400/35 bg-emerald-500/15 text-[var(--workspace-fg)]",
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
