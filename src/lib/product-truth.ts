/**
 * Honest scope — what Route5 does in this app, framed as execution intelligence.
 * UI must match: no fake agents, sync, or connectors that are not shipped.
 */
export const PRODUCT_HONEST = {
  oneLine:
    "Turn messy text into tracked decisions and actions — your workspace for execution, not just summaries.",
  whatItIs:
    "Route5 is an execution intelligence workspace: you capture context in projects, run structured extractions (summary, decisions, actions), check work off over time, and see real completion and activity trends. Linear and GitHub bring issue context into the same loop when you configure them.",
  howSteps: [
    "Create a project for an initiative, team, or thread of work.",
    "Capture on Desk or in a project — paste notes, tickets, or imports — then run extraction (AI when configured, or a fast offline digest).",
    "Review decisions, complete actions, and use Overview to see completion rate, stale work, and velocity from your real data.",
  ] as const,
  notThis:
    "There is no autonomous email sync. Slack: paste-to-Desk works for everyone; the Slack integration page and API are Pro+ (optional SLACK_BOT_TOKEN / SLACK_WEBHOOK_URL for deployment). Linear/GitHub paste-and-import flows are as documented on each screen.",
  why:
    "Decisions and actions stay tied to projects; metrics reflect your database, not demos.",
} as const;

/** Marketing line — matches in-app analytics (real extraction rows, no black box). */
export const ENTERPRISE_INTELLIGENCE = {
  oneLine:
    "Route5 turns captured context into projects you can execute: structured extractions, checklists, and activity you can chart and export — Linear and GitHub when you connect them.",
  surfaces: "Overview and Reports use the same timestamps as Desk; metrics are from your workspace data.",
} as const;

export const PRODUCT_MISSION = {
  name: "Route5",
  tagline: PRODUCT_HONEST.oneLine,
  sidebarTagline:
    "Projects and Desk → structured extractions and checklists. Overview and Reports use your real runs — not demos.",
  headline: PRODUCT_HONEST.oneLine,
  boundaryNote: PRODUCT_HONEST.notThis,
  company: "Structured extractions, action tracking, real analytics, optional Linear/GitHub.",
} as const;

/**
 * Single source of truth for what the deployed product does today.
 */
export const PRODUCT_LIVE = {
  auth: "Clerk sign-in (SSO if you configure it).",
  projects: "Projects hold extractions, decisions, action checklists, and history.",
  extract:
    "Paste raw text. With OPENAI_API_KEY: JSON extraction (summary, decisions, actions). Without: heuristic digest labeled in the run — not GPT analysis.",
  linear: "Integrations → Linear: browse, import by link, send context into projects.",
  github: "Integrations → GitHub: samples and import by URL into projects.",
  actions: "Check off action items; saved per extraction; completion rolls into workspace metrics.",
  analytics:
    "Overview shows action completion rate, stale open actions, activity trends, and per-project health from real rows.",
  limits: "100k chars per run.",
  data: "Supabase or local SQLite per user.",
} as const;

export const PRODUCT_INTEGRATIONS = {
  clerk: "Clerk: auth + profile (Settings).",
  data: "Supabase or SQLite — your data only.",
  intelligence: "AI extraction when your workspace enables it; built-in heuristic otherwise.",
  linear: "Linear: walkthrough in-app; link your org for live lists.",
  github: "GitHub: walkthrough in-app; link for assigned issues.",
} as const;

export const PRODUCT_ROADMAP = [
  "Deeper two-way sync with Linear and GitHub",
  "Slack and email capture (connector)",
  "Team roles and shared workspaces",
  "On-premise and bring-your-own LLM",
] as const;

/**
 * Harsh reality for buyers — summarizing alone is not “execution intelligence.”
 * Route5 charges for persistence, structured output, action tracking, and metrics;
 * semantic depth requires an LLM on the server.
 */
export const PRODUCT_VALUE_REALITY = {
  headline: "What “execution intelligence” actually is here",
  summary:
    "Summaries are one field. Execution intelligence in this product means: structured extractions (summary + decisions + actions), durable storage per project, checklists you complete, and dashboards computed from those completions — not magic autonomous work in Jira or Slack.",
  withoutAi:
    "Without OPENAI_API_KEY (or equivalent), extractions use a fast heuristic: first-paragraph digest, bullet/line heuristics for “decisions,” and pattern-matched lines for actions. It is labeled in the output. Do not sell that as GPT-grade analysis.",
  withAi:
    "With intelligence enabled, the model returns JSON (summary, decisions, actionItems). That is closer to the marketing story — still not auto-execution in external tools.",
  integrationsHonesty:
    "Linear/GitHub/Figma without API tokens show preview/sample rows where documented. That is not live org sync; billing should not assume it.",
  linkDocs: "/docs/product",
} as const;
