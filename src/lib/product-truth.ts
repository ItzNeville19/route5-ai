import { POSITIONING_WEDGE } from "@/lib/positioning-wedge";

export { POSITIONING_WEDGE } from "@/lib/positioning-wedge";

/**
 * North star / investor narrative — not a promise that every line is shipped yet.
 * Use next to PRODUCT_LIVE on docs, pitch, and “why Route5” copy.
 */
export const PRODUCT_VISION = {
  category:
    "Enterprise AI execution layer — sits above Slack, Notion, email, and project tools without replacing them.",
  problem:
    "Decisions happen in meetings, Slack, and documents, but they are rarely owned, tracked, or executed. Work gets summarized; accountability does not.",
  outcome:
    "Persistent accountability state: what was decided, who owns it, deadlines, and whether it happened—with risk surfaced before failure.",
  not:
    "Not a task manager, not a generic AI summarizer, not another PM suite—it closes the loop from decision to done.",
  icp:
    "B2B SaaS for C-suite and COOs at mid-market companies (often 50–500 employees) in finance, law, consulting, and operations-heavy businesses.",
  wedge:
    "Land with one team, expand org-wide. Enterprise contracts; scope scales with rollout.",
  techDirection:
    "Supabase/Firebase-class data, AI-assisted decision capture and (roadmap) agents for ingestion and escalation; integrations Slack, Gmail, Notion APIs; mobile can follow native patterns.",
} as const;

/**
 * Honest scope — what Route5 does in this app (plain language, no buzzwords).
 * UI must match: no fake agents, sync, or connectors that are not shipped.
 */
export const PRODUCT_HONEST = {
  oneLine: POSITIONING_WEDGE.productOneLine,
  whatItIs:
    "Route5 is an execution system: you organize work in projects, paste communication into Capture (or the legacy Desk surface) or a project, and the system structures commitments (owners, status, due dates). Activity and inactivity roll up on Overview so you see what is overdue, at risk, or missing an owner — not another task list disconnected from decisions.",
  howSteps: [
    "Create a project for a team, initiative, or thread of execution you need to track.",
    "Paste notes, tickets, or meeting text — capture decisions (AI when configured, or a fast offline process). Confirm commitments and owners.",
    "Use Feed to track commitments org-wide; Capture/Desk to process raw text; Overview shows execution health, stale work, and load from saved data. Optional Linear/GitHub when you configure them.",
  ] as const,
  notThis:
    "There is no autonomous email sync. Slack: paste-to-capture paths work as documented; the Slack integration page and API are Pro+ (optional SLACK_BOT_TOKEN / SLACK_WEBHOOK_URL for deployment). Linear/GitHub paste-and-import flows are as documented on each screen.",
  why:
    "Decisions and actions stay tied to projects; metrics reflect your database, not demos.",
} as const;

/**
 * Problem → product link (honest): Route5 does not “fix society,” but it targets a
 * widespread failure mode in knowledge work — unstructured input without durable follow-through.
 */
export const PRODUCT_PROBLEM = {
  headline: "Execution breaks after decisions are made",
  body:
    "Companies decide things in meetings, Slack, Notion, and email — but those decisions are rarely turned into owned, tracked work. Nobody stays accountable; tools require someone to remember to log work; summarizers capture what was said, not what must happen next. The gap is persistent accountability state, not another dashboard.",
  route5Does:
    "Route5 converts communication into owned commitments you can track to completion: capture and structure decisions, assign ownership, monitor risk and staleness on Overview, and integrate with existing tools where configured — starting with paste and API-backed paths today.",
} as const;

/**
 * Honest split for buyers comparing Route5 to a general chat subscription.
 * Chat is best for thinking; Route5 is for durable execution artifacts.
 */
export const PRODUCT_VS_EPHEMERAL_CHAT = {
  sectionTitle: "Route5 vs. a chat tab",
  intro:
    "A chat tab is fine for thinking out loud. It is a weak place to ship operational work: threads mix topics, checkboxes do not roll into metrics, and nothing stays tied to a project in your database. Route5 is built for that job — its own surface, not a wrapper around a chat model.",
  rows: [
    {
      label: "Where the work lives",
      chat: "Scrollback mixes threads; hard to audit “what we decided last Tuesday.”",
      route5: "Per-project capture history — timestamps, duplicates, and exports from your database.",
    },
    {
      label: "Structure you can execute",
      chat: "Free-form replies; you copy bullets into Jira or a doc by hand.",
      route5: "Problem + path forward + open questions + snapshot, then decisions and checkable actions per commitment — metrics from completions.",
    },
    {
      label: "Follow-through in the UI",
      chat: "No workspace-wide queue of open commitments across projects.",
      route5:
        "Feed surfaces commitments org-wide; Capture processes raw text; Overview shows execution health and what still needs an owner.",
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
  oneLine: `${POSITIONING_WEDGE.taglineShort} Charts and open-action queues from your saved commitments.`,
  surfaces: "Overview and analytics use the same timestamps as Feed and Capture; metrics are from your workspace data.",
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
  projects: "Projects hold captured decisions, commitments, action checklists, and history.",
  ingest:
    "Optional POST /api/ingest/webhook with ROUTE5_INGEST_SECRET — push text into a project as commitments (Zapier, scripts, Slack outgoing).",
  extract:
    "Paste raw text. With OPENAI_API_KEY: structured decision capture (problem, path forward, open questions, snapshot summary, decisions, actions). Without: heuristic process with the same fields, labeled on the capture — not GPT-grade analysis.",
  linear: "Settings → Connections → Linear: browse, import by link when API access is configured.",
  github: "Settings → Connections → GitHub: samples and import by URL when a token is configured.",
  actions: "Check off action items; saved per capture; completion rolls into workspace metrics.",
  analytics:
    "Overview shows action completion rate, stale open actions, activity trends, and per-project health from real rows.",
  limits: "100k chars per capture.",
  data: "Supabase or local SQLite per user.",
} as const;

export const PRODUCT_INTEGRATIONS = {
  clerk: "Clerk: auth + profile (Settings).",
  data: "Supabase or SQLite — your data only.",
  intelligence: "AI decision capture when your workspace enables it; built-in heuristic otherwise.",
  linear: "Linear: in-app walkthrough; live issue lists only when your deployment has Linear API credentials configured.",
  github: "GitHub: in-app walkthrough; live assigned issues only when your deployment has GitHub API access configured.",
} as const;

export const PRODUCT_ROADMAP = [
  "Automatic ingestion: Slack, email, Notion, meeting transcripts (connectors)",
  "Agents: monitor progress, surface blockers, escalation before deadlines slip",
  "Executive and org-wide execution health views",
  "Deeper two-way sync with Linear and GitHub",
  "Team roles, shared workspaces, audit posture",
  "On-premise and bring-your-own models where required",
] as const;

/**
 * Buyer clarity — Route5 is not “AI that does your job.”
 */
export const PRODUCT_VALUE_REALITY = {
  headline: "What you actually get",
  summary:
    "The core is next steps you can execute: what is wrong, what to do, open questions, decisions, and checkboxes — saved per project, with charts from what people finish. Route5 does not operate autonomous bots inside Jira or Slack.",
  withoutAi:
    "Without an OpenAI API key (or equivalent), captures use a fast pattern-based process and say so on each capture. That is not the same as full AI understanding — be honest when you demo.",
  withAi:
    "With AI enabled, the service returns structured fields (problem, path, questions, snapshot, decisions, actions). It still does not execute work in other tools by itself.",
  integrationsHonesty:
    "Linear, GitHub, and similar: live lists need the right setup on your deployment. Screens without credentials may show samples — that is not full company sync.",
  linkDocs: "/docs/product",
} as const;
