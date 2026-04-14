import { POSITIONING_WEDGE } from "@/lib/positioning-wedge";

/**
 * Default pilot outcomes — pick one for a 30-day trial (plan: pilot-metric).
 * Linked from /docs/sales-playbook.
 */

export const DEFAULT_PILOT_METRICS: readonly string[] = [
  "No important commitment sits more than 14 days without a named owner in Route5.",
  "Every open escalation from last week has one owner and a visible check-off.",
  "Time to answer ‘what did we commit?’ drops from hours to minutes using saved runs.",
  "Weekly overview: fewer stale open actions than when you started.",
  "One client or program runs entirely in Route5 for follow-through (single source of truth).",
] as const;

/**
 * Ask a trusted operator (e.g. ex-CEO) this before requesting intros — use their vocabulary in outreach.
 * Plan: warm-intros — not CEO as daily user; ops/account lead is the buyer.
 */
export const INTRO_LANGUAGE_CHECK = {
  title: "Language check (before you ask for intros)",
  intro:
    "You are not pitching the C-suite for daily usage. You want a short call with whoever owns delivery — ops, account, or program lead.",
  prompt:
    "When you talk to a regional ops or account leader, what exact words would make them agree to a 30-minute conversation about commitments and follow-through — without sounding like ‘another AI tool’?",
  followUp:
    "Write down their phrases and reuse them in your warm intro. Measure success as intros that lead to a pilot, not applause.",
} as const;

/** Short script for asking a senior contact for an intro (you send this — not automated). */
export const WARM_INTRO_SCRIPT = {
  title: "Asking for one introduction",
  lines: [
    POSITIONING_WEDGE.buyerSafePromise,
    "I'm not asking you to use it yourself every day. I'd love 20–30 minutes with whoever owns day-to-day delivery (ops, account, or program lead) to see if it fits their workflow.",
    "If that person finds it useful, we can run a small pilot with one success metric. If not, I'll learn fast.",
  ],
} as const;
