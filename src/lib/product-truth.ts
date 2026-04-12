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

/**
 * Problem → product link (honest): Route5 does not “fix society,” but it targets a
 * widespread failure mode in knowledge work — unstructured input without durable follow-through.
 */
export const PRODUCT_PROBLEM = {
  headline: "Unstructured text is where decisions stall",
  body:
    "Threads, tickets, notes, and write-ups pile up faster than teams can restate them. Chat summaries evaporate. The gap between what was said and what gets done is the hidden tax on execution — and it is the gap Route5 is built to narrow.",
  route5Does:
    "One workspace to capture messy input, run structured extractions (decisions + actions), check work off from Desk or projects (open-actions queue surfaces the oldest unfinished first), and chart completion from data you saved — Linear and GitHub when you connect them.",
} as const;

/**
 * Honest split for buyers comparing Route5 to a general chat subscription.
 * Chat is best for thinking; Route5 is for durable execution artifacts.
 */
export const PRODUCT_VS_EPHEMERAL_CHAT = {
  sectionTitle: 'Why "I\'ll just use ChatGPT" is the wrong comparison',
  intro:
    "General-purpose chat is excellent for drafting, tutoring, and exploration. It is a weak place to run initiatives: threads interleave topics, checkbox state does not roll into org metrics, and there is no first-class project boundary tied to your data store. Route5 is built for that latter job — not to replace chat, but to finish what chat starts.",
  rows: [
    {
      label: "Where the work lives",
      chat: "Scrollback mixes threads; hard to audit “what we decided last Tuesday.”",
      route5: "Per-project extraction history — timestamps, duplicates, and exports from your database.",
    },
    {
      label: "Structure you can execute",
      chat: "Free-form replies; you copy bullets into Jira or a doc by hand.",
      route5: "Summary + decisions + action items stored per run; check off in-app; metrics from completions.",
    },
    {
      label: "Follow-through in the UI",
      chat: "No workspace-wide queue of open commitments across projects.",
      route5: "Desk surfaces oldest open actions first; Overview reminds you before the next capture.",
    },
    {
      label: "Connectors (when configured)",
      chat: "You paste URLs or exports yourself.",
      route5: "Linear & GitHub import paths documented per screen — live lists only with tokens on your deployment.",
    },
  ] as const,
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
  linear: "Linear: in-app walkthrough; live issue lists only when your deployment has Linear API credentials configured.",
  github: "GitHub: in-app walkthrough; live assigned issues only when your deployment has GitHub API access configured.",
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
