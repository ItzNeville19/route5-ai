/**
 * Context-aware cards for Overview — prioritized, dismissible per calendar day.
 */

import { deskUrl } from "@/lib/desk-routes";
import { stableHash } from "@/lib/stable-hash";
import type { WorkspaceConnectorReadiness } from "@/lib/workspace-summary";

export type DashboardCardTone = "neutral" | "accent" | "amber" | "emerald";

export type DashboardDailyCard = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  tone: DashboardCardTone;
};

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dismissedStorageKey(userId: string): string {
  return `route5:dashboardDailyDismissed:${userId}:${dayKey()}`;
}

const DAILY_TIPS: readonly { body: string; learnMoreHref: string }[] = [
  { body: "Pin projects in the sidebar so active work stays on top.", learnMoreHref: "/docs/product" },
  { body: "⌘K opens search — jump to Desk, Marketplace, or a project by name.", learnMoreHref: "/docs/product" },
  {
    body: "Duplicate a saved run when you want to iterate without losing the original.",
    learnMoreHref: "/docs/product",
  },
  { body: "Templates on Desk pre-fill structure; you still edit before you run.", learnMoreHref: "/docs/product" },
  { body: "The workspace assistant uses your live project and run counts — ask what to do next.", learnMoreHref: "/docs/product" },
  { body: "Overview shows the same commitment metrics as the header bell — fewer places to look.", learnMoreHref: "/overview" },
  { body: "Themes under Customize adjust layout and palette without touching your runs.", learnMoreHref: "/workspace/customize" },
  { body: "Analytics and JSON export live under Reports — same totals as Overview, more depth.", learnMoreHref: "/reports" },
  { body: "Optional connectors are in Settings — nothing blocks your first capture on Desk.", learnMoreHref: "/settings#connections" },
  { body: "Replay guided onboarding anytime from the link in Today tips or Desk.", learnMoreHref: "/onboarding?replay=1" },
  { body: "Plans and run limits live under Account → Plans.", learnMoreHref: "/account/plans" },
] as const;

export type DashboardCardContext = {
  projectCount: number;
  extractionCount: number;
  readiness: WorkspaceConnectorReadiness | null;
};

/**
 * Returns cards worth showing today (newest / highest priority first).
 * Caller filters by dismissed IDs from localStorage.
 */
export function buildDashboardDailyCards(
  ctx: DashboardCardContext,
  userId: string | undefined
): DashboardDailyCard[] {
  const out: DashboardDailyCard[] = [];
  const r = ctx.readiness;

  if (ctx.projectCount === 0) {
    out.push({
      id: "need-project",
      title: "Give your work a home",
      body: "Projects hold every extraction, decision, and action. Create one, then capture on Desk.",
      ctaLabel: "Create project",
      href: "/overview",
      tone: "accent",
    });
  }

  if (ctx.projectCount > 0 && ctx.extractionCount === 0) {
    out.push({
      id: "first-extraction",
      title: "Run your first pass on Desk",
      body: "Open Desk, pick this project, paste notes or a thread, and run — that’s the core loop.",
      ctaLabel: "Open Desk",
      href: deskUrl(),
      tone: "accent",
    });
  }

  if (r && !r.openai) {
    out.push({
      id: "openai-key",
      title: "Optional AI",
      body: "Your deployment has not enabled the hosted model path yet — open AI settings to pick defaults, or ask your admin.",
      ctaLabel: "AI settings",
      href: "/settings",
      tone: "amber",
    });
  }

  if (r && !r.linear) {
    out.push({
      id: "linear-hub",
      title: "Bring Linear issues in",
      body: "Browse samples, import by link, and send context into projects — all from the Linear hub.",
      ctaLabel: "Open Linear",
      href: "/integrations/linear",
      tone: "neutral",
    });
  }

  if (r && !r.github) {
    out.push({
      id: "github-hub",
      title: "Pull GitHub context",
      body: "Try samples and URL import for issues and PRs — useful even before org-wide linking.",
      ctaLabel: "Open GitHub",
      href: "/integrations/github",
      tone: "neutral",
    });
  }

  if (r && !r.figma) {
    out.push({
      id: "figma-hub",
      title: "Import Figma files",
      body: "Add FIGMA_ACCESS_TOKEN on the server to pull text layers and comments from file links into Desk or projects.",
      ctaLabel: "Open Figma",
      href: "/integrations/figma",
      tone: "neutral",
    });
  }

  const tipIdx = stableHash(`${userId ?? "anon"}:${dayKey()}:tip`) % DAILY_TIPS.length;
  const tip = DAILY_TIPS[tipIdx]!;
  out.push({
    id: `daily-tip-${tipIdx}`,
    title: "Tip for today",
    body: tip.body,
    ctaLabel: "Learn more",
    href: tip.learnMoreHref,
    tone: "emerald",
  });

  return out;
}

export { dayKey };
