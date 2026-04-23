/**
 * Discovery script for B2B validation (contract services / ops wedge).
 * Use in calls; keep answers in notes — not stored by Route5 unless you paste them.
 */

import { PRODUCT_VALUE_REALITY } from "@/lib/product-truth";

export { DEFAULT_PILOT_METRICS as PILOT_METRIC_EXAMPLES } from "@/lib/pilot-metrics";

/** 30-day execution plan (same cadence as wedge plan — no branding rabbit holes). */
export const EXECUTION_PLAN_30_DAY: { week: string; body: string }[] = [
  {
    week: "Week 1",
    body:
      "Use the eight discovery questions below (pain, tools, cost of missed commitments, buyer, success metric). Run five calls with ops, account, or program people from warm intros.",
  },
  {
    week: "Week 2",
    body:
      "Land one paid or serious pilot (even small) with one success metric — e.g. fewer stale open actions older than 14 days, or every client escalation has a named owner in Route5.",
  },
  {
    week: "Week 3–4",
    body:
      "Iterate one Desk preset or export format based on repeated buyer asks—stay aligned with the current product (Guides → Product).",
  },
];

export const DISCOVERY_INTRO =
  "We’re checking whether commitments get lost between meetings. A few concrete questions — no slide deck.";

/**
 * Minimum bar before scaling outreach (plan: validation gates).
 * Use as a checklist — evidence in your notes, not auto-stored by Route5.
 */
export const VALIDATION_GATES: { gate: string; criteria: string }[] = [
  {
    gate: "Problem",
    criteria:
      "5 conversations where the buyer describes losing track of commitments between meetings (not “AI is cool”).",
  },
  {
    gate: "Budget",
    criteria:
      "At least 2 hint they’d pay for risk reduction, audit trail, or manager visibility (even if price unknown).",
  },
  {
    gate: "Switching",
    criteria:
      "They name their current patch (email, Excel, Jira misused, Notion) and why it fails for follow-through.",
  },
  {
    gate: "Repeat use",
    criteria: "1 pilot agrees to run 3 real programs or weeks in Route5.",
  },
];

/**
 * When someone says “just AI” — answer with artifacts (plan: sales narrative).
 * Links to live product truth in docs.
 */
export const COUNTER_WRAPPER_POINTS: { text: string }[] = [
  {
    text: "The value is committed actions stored per project with timestamps and completion metrics — same as you’d expect from a work system, not a chat.",
  },
  {
    text: `AI is optional. ${PRODUCT_VALUE_REALITY.withoutAi} See also Guides → Boundaries.`,
  },
  {
    text: "We’re not automating their job; we’re preventing dropped follow-ups between tools.",
  },
];

export const DISCOVERY_QUESTIONS: { id: string; prompt: string; followUp?: string }[] = [
  {
    id: "last-drop",
    prompt:
      "Tell me about the last time a client or internal commitment fell through the cracks. What was the cost — time, money, or trust?",
  },
  {
    id: "where-it-lives",
    prompt: "Where do those commitments live today — email, Excel, Notion, Jira, something else? Who owns keeping the list honest?",
  },
  {
    id: "why-not-tools",
    prompt: "Why isn’t the current stack enough? What breaks when you try to use it for follow-through?",
  },
  {
    id: "audit",
    prompt: "When someone asks ‘did we promise that in writing?’ — how long does it take you to reconstruct the answer?",
  },
  {
    id: "metric",
    prompt: "If a tool worked, what would you measure in 30 days? (e.g. fewer overdue items, named owners on every escalation.)",
  },
  {
    id: "buyer",
    prompt: "Who would actually use this daily — title, not C-suite — and who signs off on a pilot?",
  },
  {
    id: "pilot",
    prompt: "What would a 2-week pilot need to include for you to say yes?",
  },
  {
    id: "objections",
    prompt: "What would make you say ‘this is just another AI wrapper’ — and what would prove it isn’t?",
    followUp: "Point to saved runs, checklists, and completion on Overview—same as in Guides → Product.",
  },
];
