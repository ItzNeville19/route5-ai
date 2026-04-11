/** Daily “What’s next” — contextual, dismissible, reordered each day. */

export type InsightContext = {
  projectCount: number;
  extractionCount: number;
  liveConnectorCount: number | null;
  readiness: { openai: boolean; linear: boolean; github: boolean } | null;
};

export type DashboardInsight = {
  id: string;
  title: string;
  body: string | ((ctx: InsightContext) => string);
  cta?: string;
  href?: string;
  when?:
    | "always"
    | "no_projects"
    | "no_extractions"
    | "has_projects"
    | "has_extractions"
    | "needs_connections"
    | "power_user"
    | "active_workspace"
    | "linear_live"
    | "github_live"
    | "ai_on"
    | "ai_off"
    | "many_projects"
    | "single_project"
    | "heavy_extractions";
};

export const DASHBOARD_INSIGHTS: DashboardInsight[] = [
  {
    id: "start-project",
    title: "Start here",
    body: "Create a project — it’s the container for extractions, history, and exports. One per initiative works well.",
    cta: "Create project",
    href: "/projects#new-project",
    when: "no_projects",
  },
  {
    id: "first-extraction",
    title: "Run an extraction",
    body: "Open a project, paste notes or a thread, then Run extraction. You’ll get summary, decisions, and checkable actions.",
    cta: "Open projects",
    href: "/projects",
    when: "no_extractions",
  },
  {
    id: "counts-aware",
    title: "Your workspace in numbers",
    body: (ctx) =>
      `You have ${ctx.projectCount} project${ctx.projectCount === 1 ? "" : "s"} and ${ctx.extractionCount} extraction run${ctx.extractionCount === 1 ? "" : "s"}. Open the sidebar → History to jump back into recent work.`,
    when: "has_extractions",
  },
  {
    id: "relay-ask",
    title: "Ask Relay",
    body: "Relay knows your workspace counts and routes — ask for Linear, Desk, or templates without breaking focus.",
    cta: "Open Relay",
    href: "/projects",
    when: "has_projects",
  },
  {
    id: "palette",
    title: "Jump with ⌘K",
    body: "Open the command palette to jump to a project, route, or action — faster than scanning the sidebar.",
    when: "always",
  },
  {
    id: "desk-capture",
    title: "Capture on Desk",
    body: "Draft on Desk, then move the note into a project when it’s ready — keeps project threads tidy.",
    cta: "Open Desk",
    href: "/desk",
    when: "always",
  },
  {
    id: "integrations",
    title: "Integrations",
    body: "Linear and GitHub work with samples immediately; link your org when you want live lists and imports.",
    cta: "Integrations",
    href: "/integrations",
    when: "needs_connections",
  },
  {
    id: "templates",
    title: "Templates",
    body: "Decision, Incident, Meeting — one tap loads the composer with real starter text; edit and run extraction.",
    cta: "Templates below",
    href: "/projects",
    when: "always",
  },
  {
    id: "pin-sidebar",
    title: "Pin what you ship",
    body: "Pin projects in the sidebar so your active work stays on top — same idea as pinning chats elsewhere.",
    when: "many_projects",
  },
  {
    id: "single-focus",
    title: "One project, full depth",
    body: "With a single project, use extractions as a decision log — each run adds history you can scroll and export.",
    when: "single_project",
  },
  {
    id: "export-json",
    title: "Export from any project",
    body: "Open a project dashboard — extractions can be exported as JSON for audits or tooling.",
    when: "heavy_extractions",
  },
  {
    id: "activity-panel",
    title: "Activity rail",
    body: "Toggle Panel in the header for recent runs and API links — optional if you prefer History in the sidebar.",
    when: "active_workspace",
  },
  {
    id: "linear-live",
    title: "Linear is live",
    body: "Your deployment has Linear connected — browse issues and import by link from Integrations → Linear.",
    cta: "Linear",
    href: "/integrations/linear",
    when: "linear_live",
  },
  {
    id: "github-live",
    title: "GitHub is live",
    body: "Assigned issues and import-by-URL are available under Integrations → GitHub.",
    cta: "GitHub",
    href: "/integrations/github",
    when: "github_live",
  },
  {
    id: "ai-on",
    title: "AI extraction on",
    body: "Structured LLM output is enabled for this workspace — you’ll get richer summaries when you run extractions.",
    when: "ai_on",
  },
  {
    id: "ai-off",
    title: "Heuristic mode",
    body: "This deployment is on the built-in digest path — extractions still run; enable AI in your stack when you’re ready.",
    cta: "Health & status",
    href: "/marketplace/health",
    when: "ai_off",
  },
  {
    id: "power-user",
    title: "Keep signal high",
    body: (ctx) =>
      `${ctx.extractionCount} runs logged — filter extractions inside a project by summary or text when the list grows.`,
    when: "power_user",
  },
  {
    id: "app-library",
    title: "App library",
    body: "Sidebar → App library lists 37 jumps — docs, store pages, Relay, palette, and activity panel.",
    when: "has_projects",
  },
  {
    id: "marketplace-install",
    title: "Marketplace installs",
    body: "Marketplace apps use GET → install → Open; your library remembers what you’ve added on this device.",
    cta: "Browse",
    href: "/marketplace",
    when: "always",
  },
];

const DISMISSED_KEY = "route5:dashboardDismissedInsights.v2";

export function loadDismissedInsightIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function dismissInsight(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...loadDismissedInsightIds(), id];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearDismissedInsights(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

function matchesWhen(
  when: DashboardInsight["when"],
  ctx: InsightContext
): boolean {
  const needsConnections =
    ctx.liveConnectorCount !== null && ctx.liveConnectorCount < 2;
  switch (when) {
    case "always":
      return true;
    case "no_projects":
      return ctx.projectCount === 0;
    case "no_extractions":
      return ctx.projectCount > 0 && ctx.extractionCount === 0;
    case "has_projects":
      return ctx.projectCount > 0;
    case "has_extractions":
      return ctx.extractionCount > 0;
    case "needs_connections":
      return needsConnections;
    case "power_user":
      return ctx.extractionCount >= 12;
    case "active_workspace":
      return ctx.projectCount > 0 && ctx.extractionCount >= 3;
    case "linear_live":
      return Boolean(ctx.readiness?.linear);
    case "github_live":
      return Boolean(ctx.readiness?.github);
    case "ai_on":
      return Boolean(ctx.readiness?.openai);
    case "ai_off":
      return ctx.readiness !== null && !ctx.readiness.openai;
    case "many_projects":
      return ctx.projectCount >= 4;
    case "single_project":
      return ctx.projectCount === 1;
    case "heavy_extractions":
      return ctx.extractionCount >= 6;
    default:
      return true;
  }
}

export function resolveInsightBody(
  insight: DashboardInsight,
  ctx: InsightContext
): string {
  return typeof insight.body === "function" ? insight.body(ctx) : insight.body;
}

/** Deterministic daily shuffle — same user + calendar day (in chosen TZ) → same order. */
export function dailyShuffledInsightIds(
  ids: string[],
  userId: string | undefined,
  dayKey: string
): string[] {
  const seed = `${dayKey}:${userId ?? "anon"}`;
  const arr = [...ids];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type ResolvedInsight = DashboardInsight & { bodyResolved: string };

export function filterInsightsForUser(
  insights: DashboardInsight[],
  ctx: InsightContext,
  dismissed: Set<string>,
  userId: string | undefined,
  dayKey: string
): ResolvedInsight[] {
  const resolved: ResolvedInsight[] = [];
  for (const ins of insights) {
    if (dismissed.has(ins.id)) continue;
    if (!matchesWhen(ins.when ?? "always", ctx)) continue;
    resolved.push({
      ...ins,
      bodyResolved: resolveInsightBody(ins, ctx),
    });
  }
  const order = dailyShuffledInsightIds(
    resolved.map((r) => r.id),
    userId,
    dayKey
  );
  const byId = new Map(resolved.map((r) => [r.id, r]));
  const ordered: ResolvedInsight[] = [];
  for (const id of order) {
    const r = byId.get(id);
    if (r) ordered.push(r);
  }
  return ordered;
}
