import { POSITIONING_WEDGE } from "@/lib/positioning-wedge";

export { POSITIONING_WEDGE } from "@/lib/positioning-wedge";

/**
 * Honest scope — what Route5 does in this app (plain language, no buzzwords).
 * UI must match: no fake agents, sync, or connectors that are not shipped.
 * Primary GTM: contract & program operations (see POSITIONING_WEDGE).
 */
export const PRODUCT_HONEST = {
  oneLine: POSITIONING_WEDGE.productOneLine,
  whatItIs:
    "You work in projects. Desk and in-project capture turn pasted threads, tickets, or notes into structured runs: what’s wrong, what to do about it, open questions, a short snapshot, decisions, and checkable actions. Complete actions over time; Overview and Reports read the same saved data. Linear and GitHub fit in when you configure them.",
  howSteps: [
    "Create a project for an initiative, team, or thread of work.",
    "Capture on Desk or in a project — paste notes, tickets, or imports — then run a pass (AI when configured, or a fast offline pass).",
    "Clear next moves from Desk or the project; Overview shows completion and activity from what you actually saved.",
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
  headline: "Client and internal commitments stall in unstructured text",
  body:
    "Threads, tickets, and notes pile up faster than anyone can restate them. The gap between what was said and what gets done is where delivery risk lives — Route5 narrows that gap with saved runs, named actions, and checklists you can audit, not another scrollback.",
  route5Does:
    "One workspace to capture messy input, run structured passes (problem, path, questions, actions), check work off from Desk or projects (oldest open items first), and chart completion from data you saved — Linear and GitHub when you connect them.",
} as const;

/**
 * Honest split for buyers comparing Route5 to a general chat subscription.
 * Chat is best for thinking; Route5 is for durable execution artifacts.
 */
export const PRODUCT_VS_EPHEMERAL_CHAT = {
  sectionTitle: "Route5 vs. a chat tab",
  intro:
    "A chat tab is fine for thinking out loud. It is a weak place to run work that has to ship: threads mix topics, checkboxes do not roll into metrics, and nothing stays tied to a project in your database. Route5 is built for that job — its own surface, not a wrapper around a chat model.",
  rows: [
    {
      label: "Where the work lives",
      chat: "Scrollback mixes threads; hard to audit “what we decided last Tuesday.”",
      route5: "Per-project extraction history — timestamps, duplicates, and exports from your database.",
    },
    {
      label: "Structure you can execute",
      chat: "Free-form replies; you copy bullets into Jira or a doc by hand.",
      route5: "Problem + path forward + open questions + snapshot, then decisions and checkable actions per run — metrics from completions.",
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

/** Short positioning line — matches in-app analytics (real rows, no black box). */
export const ENTERPRISE_INTELLIGENCE = {
  oneLine: `${POSITIONING_WEDGE.taglineShort} Charts and open-action queues from your saved runs. Linear and GitHub when you connect them.`,
  surfaces: "Overview and Reports use the same timestamps as Desk; metrics are from your workspace data.",
} as const;

export const PRODUCT_MISSION = {
  name: "Route5",
  tagline: PRODUCT_HONEST.oneLine,
  sidebarTagline: POSITIONING_WEDGE.taglineShort,
  headline: PRODUCT_HONEST.oneLine,
  boundaryNote: PRODUCT_HONEST.notThis,
  company: POSITIONING_WEDGE.qualityBar,
} as const;

/**
 * Single source of truth for what the deployed product does today.
 */
export const PRODUCT_LIVE = {
  auth: "Clerk sign-in (SSO if you configure it).",
  projects: "Projects hold extractions, decisions, action checklists, and history.",
  extract:
    "Paste raw text. With OPENAI_API_KEY: JSON extraction (problem, path forward, open questions, snapshot summary, decisions, actions). Without: heuristic pass with the same fields, labeled in the run — not GPT-grade analysis.",
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
 * Buyer clarity — Route5 is not “AI that does your job.”
 */
export const PRODUCT_VALUE_REALITY = {
  headline: "What you actually get",
  summary:
    "The core is next steps you can execute: what is wrong, what to do, open questions, decisions, and checkboxes — saved per project, with charts from what people finish. Route5 does not run autonomous bots inside Jira or Slack.",
  withoutAi:
    "Without an OpenAI API key (or equivalent), runs use a fast pattern-based pass and say so on each run. That is not the same as full AI understanding — be honest when you demo.",
  withAi:
    "With AI enabled, the service returns structured fields (problem, path, questions, snapshot, decisions, actions). It still does not execute work in other tools by itself.",
  integrationsHonesty:
    "Linear, GitHub, and similar: live lists need the right setup on your deployment. Screens without credentials may show samples — that is not full company sync.",
  linkDocs: "/docs/product",
} as const;
