import type { BrandIconId } from "@/components/marketplace/brand-icons";

export type MarketplaceCategoryId =
  | "all"
  | "built-in"
  | "stack"
  | "productivity"
  | "collaboration"
  | "data"
  | "enterprise";

export type MarketplaceKind = "native" | "stack" | "roadmap";

/** External consoles for stack integrations (real URLs). */
export const INTEGRATION_MANAGE_URLS = {
  clerk: "https://dashboard.clerk.com",
  supabase: "https://supabase.com/dashboard",
  openai: "https://platform.openai.com",
} as const;

export type MarketplaceApp = {
  id: string;
  name: string;
  subtitle: string;
  category: Exclude<MarketplaceCategoryId, "all">;
  kind: MarketplaceKind;
  brandId: BrandIconId;
  /** In-app or same-site URL */
  href?: string;
  /** Vendor dashboard / API console */
  manageUrl?: string;
  /** Official product page (roadmap — learn before requesting) */
  learnMoreUrl?: string;
  contactTopic?: string;
};

export const MARKETPLACE_CATEGORIES: {
  id: MarketplaceCategoryId;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "built-in", label: "Built-in" },
  { id: "stack", label: "Your stack" },
  { id: "productivity", label: "Productivity" },
  { id: "collaboration", label: "Collaboration" },
  { id: "data", label: "Data & AI" },
  { id: "enterprise", label: "Enterprise" },
];

/** Native Route5 — every href is a real route in this app. */
export const MARKETPLACE_NATIVE: MarketplaceApp[] = [
  {
    id: "linear",
    name: "Linear",
    subtitle: "Open and work — browse, import, send to extractions immediately.",
    category: "productivity",
    kind: "native",
    brandId: "linear",
    href: "/integrations/linear",
    manageUrl: "https://linear.app/settings/account",
  },
  {
    id: "github-issues",
    name: "GitHub issues",
    subtitle: "Browse samples, import by URL, copy into projects — full flow, first tap.",
    category: "data",
    kind: "native",
    brandId: "github",
    href: "/integrations/github",
    manageUrl: "https://github.com/settings/tokens",
  },
  {
    id: "virtual-desk",
    name: "Desk",
    subtitle: "Capture, extract, and jump to tools — your main surface.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceHome",
    href: "/desk",
  },
  {
    id: "figma",
    name: "Figma",
    subtitle: "Design links and feedback → structured extractions on Desk.",
    category: "collaboration",
    kind: "native",
    brandId: "figma",
    href: "/integrations/figma",
    learnMoreUrl: "https://www.figma.com",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    subtitle: "Docs, Calendar, and Gmail context — paste today; OAuth when wired.",
    category: "collaboration",
    kind: "native",
    brandId: "google",
    href: "/integrations/google",
    learnMoreUrl: "https://workspace.google.com",
  },
  {
    id: "composer",
    name: "Composer",
    subtitle: "Name projects and capture context.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceCompose",
    href: "/projects#new-project",
  },
  {
    id: "intelligence",
    name: "Runs",
    subtitle: "Summaries, decisions, and checkable actions per extraction.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/projects",
  },
  {
    id: "workspace-reports",
    name: "Reports",
    subtitle: "Workspace counts and recent extraction activity with links into each run.",
    category: "data",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/reports",
  },
  {
    id: "palette",
    name: "Command palette",
    subtitle: "⌘K — jump anywhere in the workspace.",
    category: "productivity",
    kind: "native",
    brandId: "workspaceHub",
    href: "/projects?tool=palette",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    subtitle: "Every surface in Route5 — open anything and start.",
    category: "built-in",
    kind: "native",
    brandId: "mcp",
    href: "/marketplace",
  },
  {
    id: "documentation",
    name: "Documentation",
    subtitle: "Product, roadmap, boundaries, and legal — each with its own page.",
    category: "built-in",
    kind: "native",
    brandId: "generic",
    href: "/docs",
  },
  {
    id: "onboarding",
    name: "Setup",
    subtitle: "Guided first-run.",
    category: "built-in",
    kind: "native",
    brandId: "voice",
    href: "/onboarding",
  },
  {
    id: "settings",
    name: "Account",
    subtitle: "Profile, security, sessions (Clerk).",
    category: "built-in",
    kind: "native",
    brandId: "clerk",
    href: "/settings",
    manageUrl: INTEGRATION_MANAGE_URLS.clerk,
  },
  {
    id: "health",
    name: "Connection status",
    subtitle: "Storage, AI mode, and every integration — one tap to open.",
    category: "stack",
    kind: "native",
    brandId: "supabase",
    href: "/integrations",
  },
  {
    id: "pricing",
    name: "Plans",
    subtitle: "Billing and limits (workspace view).",
    category: "enterprise",
    kind: "native",
    brandId: "hubspot",
    href: "/account/plans",
  },
  {
    id: "contact",
    name: "Support",
    subtitle: "Sales, integrations, and help — inside the workspace.",
    category: "enterprise",
    kind: "native",
    brandId: "salesforce",
    href: "/support",
  },
  {
    id: "pitch",
    name: "What we ship",
    subtitle: "Product scope — live vs planned.",
    category: "enterprise",
    kind: "native",
    brandId: "notion",
    href: "/docs/product",
  },
  {
    id: "privacy",
    name: "Privacy",
    subtitle: "How we handle data in the workspace.",
    category: "enterprise",
    kind: "native",
    brandId: "generic",
    href: "/docs/privacy",
  },
  {
    id: "terms",
    name: "Terms",
    subtitle: "Terms of use for the workspace.",
    category: "enterprise",
    kind: "native",
    brandId: "generic",
    href: "/docs/terms",
  },
  {
    id: "home-landing",
    name: "Product home",
    subtitle: "Marketing overview and sign-in entry.",
    category: "built-in",
    kind: "native",
    brandId: "route5",
    href: "/",
  },
  {
    id: "projects-board",
    name: "Project board",
    subtitle: "Create projects and open the one you need.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceCompose",
    href: "/projects",
  },
  {
    id: "integrations-hub",
    name: "Integrations hub",
    subtitle: "Linear, GitHub, Figma — connect without leaving Route5.",
    category: "stack",
    kind: "native",
    brandId: "workspaceHub",
    href: "/integrations",
  },
  {
    id: "integrations-github",
    name: "GitHub workspace",
    subtitle: "Assigned issues and import by URL.",
    category: "data",
    kind: "native",
    brandId: "github",
    href: "/integrations/github",
  },
  {
    id: "integrations-linear",
    name: "Linear workspace",
    subtitle: "List and pull issues into extractions.",
    category: "productivity",
    kind: "native",
    brandId: "linear",
    href: "/integrations/linear",
  },
  {
    id: "docs-home",
    name: "Docs home",
    subtitle: "All documentation in one place.",
    category: "built-in",
    kind: "native",
    brandId: "generic",
    href: "/docs",
  },
  {
    id: "docs-boundaries",
    name: "Boundaries",
    subtitle: "What we do and do not promise in this product.",
    category: "enterprise",
    kind: "native",
    brandId: "generic",
    href: "/docs/boundaries",
  },
  {
    id: "docs-roadmap-page",
    name: "Roadmap doc",
    subtitle: "Planned direction — read before requesting features.",
    category: "enterprise",
    kind: "native",
    brandId: "notion",
    href: "/docs/roadmap",
  },
  {
    id: "contact-direct",
    name: "Contact",
    subtitle: "Reach the team — integrations, sales, support.",
    category: "enterprise",
    kind: "native",
    brandId: "salesforce",
    href: "/contact",
  },
  {
    id: "pricing-public",
    name: "Pricing",
    subtitle: "Public pricing and packaging overview.",
    category: "enterprise",
    kind: "native",
    brandId: "hubspot",
    href: "/pricing",
  },
  {
    id: "pitch-deck",
    name: "Pitch",
    subtitle: "Short product story for stakeholders.",
    category: "enterprise",
    kind: "native",
    brandId: "notion",
    href: "/pitch",
  },
  {
    id: "scratch-feature",
    name: "Scratch pad",
    subtitle: "Per-project notes before you run an extraction.",
    category: "productivity",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/projects",
  },
  {
    id: "export-json",
    name: "JSON export",
    subtitle: "Export extractions from any project dashboard.",
    category: "data",
    kind: "native",
    brandId: "mcp",
    href: "/projects",
  },
  {
    id: "filter-extractions",
    name: "Search extractions",
    subtitle: "Filter runs by summary, text, and decisions.",
    category: "productivity",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/projects",
  },
  {
    id: "duplicate-run",
    name: "Duplicate extraction",
    subtitle: "Clone a run to iterate without losing history.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/projects",
  },
  {
    id: "action-checklist",
    name: "Action checklist",
    subtitle: "Check off items per extraction — saved automatically.",
    category: "productivity",
    kind: "native",
    brandId: "workspaceCompose",
    href: "/projects",
  },
  {
    id: "workspace-focus",
    name: "Focus mode",
    subtitle: "Hide side rails from the workspace sidebar.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceHome",
    href: "/projects",
  },
  {
    id: "right-panel",
    name: "Activity & API panel",
    subtitle: "Recent runs and API links — toggle from the header.",
    category: "stack",
    kind: "native",
    brandId: "workspaceHub",
    href: "/projects",
  },
  {
    id: "pinned-projects",
    name: "Pinned projects",
    subtitle: "Keep key projects at the top of the sidebar.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceCompose",
    href: "/projects",
  },
  {
    id: "clerk-sessions",
    name: "Sessions & security",
    subtitle: "Clerk-powered sign-in and device sessions.",
    category: "stack",
    kind: "native",
    brandId: "clerk",
    href: "/settings",
  },
];

/** Live stack — links go to real consoles; status from /api/health. */
export const MARKETPLACE_STACK: MarketplaceApp[] = [
  {
    id: "clerk",
    name: "Clerk",
    subtitle: "Auth, sessions, user directory.",
    category: "stack",
    kind: "stack",
    brandId: "clerk",
    href: "/settings",
    manageUrl: INTEGRATION_MANAGE_URLS.clerk,
  },
  {
    id: "supabase",
    name: "Workspace DB",
    subtitle: "Your data stays yours — cloud or on-device, always running.",
    category: "stack",
    kind: "stack",
    brandId: "supabase",
    href: "/integrations",
    manageUrl: INTEGRATION_MANAGE_URLS.supabase,
  },
  {
    id: "openai",
    name: "OpenAI",
    subtitle: "Smarter extractions when available — graceful offline mode always on.",
    category: "data",
    kind: "stack",
    brandId: "openai",
    href: "/integrations",
    manageUrl: INTEGRATION_MANAGE_URLS.openai,
  },
];

/** Roadmap — not connected yet; Learn more = vendor site, Request = contact. */
export const MARKETPLACE_ROADMAP: MarketplaceApp[] = [
  {
    id: "slack",
    name: "Slack",
    subtitle: "Threads → projects (planned connector).",
    category: "collaboration",
    kind: "roadmap",
    brandId: "slack",
    learnMoreUrl: "https://slack.com",
    contactTopic: "Slack",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    subtitle: "Channel context → extraction (planned).",
    category: "collaboration",
    kind: "roadmap",
    brandId: "teams",
    learnMoreUrl: "https://www.microsoft.com/microsoft-teams",
    contactTopic: "Microsoft Teams",
  },
  {
    id: "jira",
    name: "Jira",
    subtitle: "Issues as structured input (planned).",
    category: "productivity",
    kind: "roadmap",
    brandId: "jira",
    learnMoreUrl: "https://www.atlassian.com/software/jira",
    contactTopic: "Jira",
  },
  {
    id: "notion",
    name: "Notion",
    subtitle: "Pages → pipelines (planned).",
    category: "productivity",
    kind: "roadmap",
    brandId: "notion",
    learnMoreUrl: "https://www.notion.so",
    contactTopic: "Notion",
  },
  {
    id: "confluence",
    name: "Confluence",
    subtitle: "Wiki & specs (planned).",
    category: "productivity",
    kind: "roadmap",
    brandId: "confluence",
    learnMoreUrl: "https://www.atlassian.com/software/confluence",
    contactTopic: "Confluence",
  },
  {
    id: "github",
    name: "GitHub (automation)",
    subtitle: "Webhooks, org policies, CI glue (roadmap — use GitHub issues for live import).",
    category: "data",
    kind: "roadmap",
    brandId: "github",
    learnMoreUrl: "https://github.com",
    contactTopic: "GitHub",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    subtitle: "CRM context (planned).",
    category: "enterprise",
    kind: "roadmap",
    brandId: "salesforce",
    learnMoreUrl: "https://www.salesforce.com",
    contactTopic: "Salesforce",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    subtitle: "Marketing & sales handoff (planned).",
    category: "enterprise",
    kind: "roadmap",
    brandId: "hubspot",
    learnMoreUrl: "https://www.hubspot.com",
    contactTopic: "HubSpot",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    subtitle: "Warehouse-backed context (planned).",
    category: "data",
    kind: "roadmap",
    brandId: "snowflake",
    learnMoreUrl: "https://www.snowflake.com",
    contactTopic: "Snowflake",
  },
  {
    id: "mcp",
    name: "MCP & APIs",
    subtitle: "Generated connectors (roadmap).",
    category: "data",
    kind: "roadmap",
    brandId: "mcp",
    learnMoreUrl: "https://modelcontextprotocol.io",
    contactTopic: "MCP / APIs",
  },
  {
    id: "sso",
    name: "Enterprise SSO",
    subtitle: "SAML / OIDC via Clerk when you configure it.",
    category: "enterprise",
    kind: "roadmap",
    brandId: "sso",
    learnMoreUrl: "https://clerk.com/docs/authentication/enterprise-sso",
    contactTopic: "Enterprise SSO",
  },
  {
    id: "onprem",
    name: "On-premise",
    subtitle: "Deployment for regulated teams (roadmap).",
    category: "enterprise",
    kind: "roadmap",
    brandId: "onprem",
    learnMoreUrl: "https://clerk.com",
    contactTopic: "On-premise",
  },
  {
    id: "voice",
    name: "Voice capture",
    subtitle: "Dictation into composer (planned).",
    category: "productivity",
    kind: "roadmap",
    brandId: "voice",
    learnMoreUrl: "https://developer.apple.com/documentation/speech",
    contactTopic: "Voice capture",
  },
];

export const ALL_MARKETPLACE_APPS: MarketplaceApp[] = [
  ...MARKETPLACE_NATIVE,
  ...MARKETPLACE_STACK,
  ...MARKETPLACE_ROADMAP,
];

function orderByIds(apps: MarketplaceApp[], ids: string[]): MarketplaceApp[] {
  const m = new Map(apps.map((a) => [a.id, a]));
  const out: MarketplaceApp[] = [];
  for (const id of ids) {
    const a = m.get(id);
    if (a) out.push(a);
  }
  for (const a of apps) {
    if (!out.some((x) => x.id === a.id)) out.push(a);
  }
  return out;
}

const NATIVE_BROWSE_ORDER = [
  "virtual-desk",
  "github-issues",
  "linear",
  "figma",
  "google-workspace",
  "documentation",
  "palette",
  "intelligence",
  "workspace-reports",
  "composer",
  "marketplace",
  "onboarding",
  "settings",
  "health",
  "pricing",
  "contact",
  "pitch",
  "privacy",
  "terms",
];

const ROADMAP_BROWSE_ORDER = [
  "voice",
  "github",
  "slack",
  "notion",
  "jira",
  "teams",
  "mcp",
  "salesforce",
  "hubspot",
  "snowflake",
  "confluence",
  "sso",
  "onprem",
];

/** Marketplace home — non-default order so tiles are not “all Route5 in a row”. */
export function marketplaceNativeBrowseOrdered(): MarketplaceApp[] {
  return orderByIds(MARKETPLACE_NATIVE, NATIVE_BROWSE_ORDER);
}

export function marketplaceStackBrowseOrdered(): MarketplaceApp[] {
  return [...MARKETPLACE_STACK].sort((a, b) => a.id.localeCompare(b.id));
}

export function marketplaceRoadmapBrowseOrdered(): MarketplaceApp[] {
  return orderByIds(MARKETPLACE_ROADMAP, ROADMAP_BROWSE_ORDER);
}

export function filterMarketplaceApps(
  apps: MarketplaceApp[],
  category: MarketplaceCategoryId,
  query: string
): MarketplaceApp[] {
  const q = query.trim().toLowerCase();
  return apps.filter((app) => {
    if (category !== "all" && app.category !== category) return false;
    if (!q) return true;
    return (
      app.name.toLowerCase().includes(q) ||
      app.subtitle.toLowerCase().includes(q)
    );
  });
}

export function contactHref(topic: string): string {
  const p = new URLSearchParams();
  p.set("topic", "integration");
  p.set("app", topic);
  return `/contact?${p.toString()}`;
}

export function getMarketplaceAppById(id: string): MarketplaceApp | undefined {
  return ALL_MARKETPLACE_APPS.find((a) => a.id === id);
}
