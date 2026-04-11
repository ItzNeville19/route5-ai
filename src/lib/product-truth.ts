/**
 * Honest scope — what Route5 actually does in this app today.
 * UI should never imply connectors, agents, or automation that aren’t shipped.
 */
export const PRODUCT_HONEST = {
  oneLine: "Paste text → structured run per project: summary, decisions, actions, history.",
  notThis: "No Slack/Jira/email sync. No headless agents. Marketplace = live vs roadmap.",
  why: "Compress threads into decisions and checklists; Linear and GitHub imports work out of the box.",
} as const;

export const PRODUCT_MISSION = {
  name: "Route5",
  tagline: PRODUCT_HONEST.oneLine,
  sidebarTagline: "Paste → structured runs. Connections in Integrations.",
  headline: PRODUCT_HONEST.oneLine,
  boundaryNote: PRODUCT_HONEST.notThis,
  company: "Today: extraction, history, checklists, connected imports.",
} as const;

/**
 * Single source of truth for what the deployed product actually does today.
 */
export const PRODUCT_LIVE = {
  auth: "Clerk sign-in (SSO if you configure it).",
  projects: "Projects hold extractions and history.",
  extract:
    "Paste raw text. AI extraction when enabled; otherwise a fast heuristic digest.",
  linear: "Integrations → Linear: browse samples, import by link, send to projects — live sync optional.",
  github: "Integrations → GitHub: samples and import by URL — live sync optional.",
  actions: "Check off action items; saved per extraction.",
  limits: "100k chars per run.",
  data: "Supabase or local SQLite per user.",
} as const;

export const PRODUCT_INTEGRATIONS = {
  clerk: "Clerk: auth + profile (Settings).",
  data: "Supabase or SQLite — your data only.",
  intelligence: "AI extraction when your workspace enables it; built-in heuristic otherwise.",
  linear: "Linear: full walkthrough in-app; link your org for live lists.",
  github: "GitHub: full walkthrough in-app; link your org for assigned issues.",
} as const;

export const PRODUCT_ROADMAP = [
  "Legacy system connectors and trace capture",
  "Generated APIs / MCP servers from captured behavior",
  "Automated parity validation vs. production",
  "On-premise deployment and bring-your-own LLM",
] as const;
