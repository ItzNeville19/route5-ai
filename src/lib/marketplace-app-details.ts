import type { MarketplaceApp } from "@/lib/marketplace-catalog";

/** App Store–style detail copy — full “about” for the launch screen. */
const DETAILS: Record<string, { about: string; highlights: string[] }> = {
  "virtual-desk": {
    about:
      "Your desk: the primary workplace where integrations send context, templates shape runs, and every extraction shares one pipeline with Overview and project history — not a side panel.",
    highlights: [
      "Same runs as Overview metrics and reports",
      "Connectors (Linear, GitHub, Figma, Google) route here first",
      "Multitask: switch projects without leaving the capture flow",
    ],
  },
  figma: {
    about:
      "With FIGMA_ACCESS_TOKEN on the server, Integrations → Figma pulls TEXT layers and file comments from any link you can read, then sends the bundle to Desk or a project extraction — no copy-paste scavenger hunt. Without the token, Desk still accepts manual paste like any capture surface.",
    highlights: [
      "Import by file, design, or community URL (or raw file key)",
      "Open on Desk or Send to project in one session",
      "Health: GET /api/health includes figmaConfigured",
    ],
  },
  composer: {
    about:
      "Create projects from the first line of text and optional notes. The composer is the fastest way to stand up a new workspace container before you paste real input.",
    highlights: ["First line becomes the project name", "⌘↵ creates and opens the project"],
  },
  intelligence: {
    about:
      "Overview shows execution metrics from your database: action completion, stale open items, activity charts, and per-project health — plus recent runs and onboarding.",
    highlights: ["Real completion rate and velocity", "Runs and decisions stay per project"],
  },
  linear: {
    about:
      "Pulls live issue context from Linear into Route5. Open in Desk sends text straight into extraction — the same pipeline as paste capture; optional API key unlocks your team’s issues.",
    highlights: [
      "Recent issues and import by URL or TEAM-123",
      "Open in Desk — no clipboard scavenger hunt",
      "Runs sync with Overview and project history",
    ],
  },
  "github-issues": {
    about:
      "Lists issues assigned to your GitHub identity and imports by URL or owner/repo#number. Each issue can open in Desk for extraction — shared with Overview metrics.",
    highlights: [
      "Assigned issues across repos you use",
      "Per-issue Open in Desk",
      "Same projects and history as every other connector",
    ],
  },
  palette: {
    about:
      "Jump anywhere in the workspace with the keyboard. The palette is indexed from your projects and routes—built for speed once you know the name.",
    highlights: ["⌘K from almost anywhere", "Same search as the sidebar"],
  },
  marketplace: {
    about:
      "Browse built-in surfaces, live stack status, and roadmap integrations. Each listing opens its own detail page with a primary action that navigates in-app when wired.",
    highlights: ["Stack status from live health checks", "Roadmap items open vendor or contact flows"],
  },
  documentation: {
    about:
      "In-app documentation hub: what ships, roadmap, boundaries, and legal summaries. Every section is a real route — not a hash-only affordance.",
    highlights: ["Dedicated URLs under /docs", "Links to public legal text where required"],
  },
  onboarding: {
    about:
      "A short guided path: verify your stack, optionally create a project, and land on the desk ready to extract. You can skip anytime.",
    highlights: ["Health check against /api/health", "Creates a real project via API"],
  },
  settings: {
    about:
      "Account, security, and sessions are managed by Clerk. Plans and limits are also available in-app under Account → Plans.",
    highlights: ["Profile and devices", "Sessions you can revoke"],
  },
  "integrations-hub": {
    about:
      "The integrations hub lists Desk, Linear, GitHub, Figma, and Google routes. For raw stack diagnostics, GET /api/health returns storage mode and connector flags (no secrets).",
    highlights: [
      "Every wired connector from one place",
      "Status strip uses the same readiness flags as Overview (OpenAI, Linear, GitHub, Figma)",
    ],
  },
  "workspace-apps": {
    about:
      "Library is a simple launcher for the same routes as the sidebar — useful when you want a grid instead of navigation.",
    highlights: ["Grouped by Work, Reports, Connections, Workspace", "Every link is a real route"],
  },
  "google-workspace": {
    about:
      "The Google Workspace integration lives at /integrations/google: paste mail or doc context into Desk or a project today. OAuth-backed sync is on the roadmap; the route is real now.",
    highlights: [
      "Same hub as Linear and GitHub",
      "Honest about paste-first vs future connect",
    ],
  },
  "workspace-reports": {
    about:
      "Workspace reports pull live counts and recent extractions from /api/workspace/summary — each row links to the project run.",
    highlights: ["Project and extraction totals", "Deep links into history"],
  },
  pricing: {
    about:
      "In-app view of plans, limits, and how to reach us for procurement. Mirrors the public pricing story without kicking you out of the workspace.",
    highlights: ["Workspace limits described in-app", "Enterprise by conversation"],
  },
  contact: {
    about:
      "Support hub inside the workspace: opens the same contact flow as the public site so nothing is a fake button.",
    highlights: ["Sales, integrations, and onboarding", "Public form for deliverability"],
  },
  pitch: {
    about:
      "The detailed “what we ship” briefing, now hosted under /docs/product so it always opens inside the workspace shell.",
    highlights: ["Honest live vs roadmap", "Cross-links to boundaries and roadmap pages"],
  },
  privacy: {
    about:
      "Workspace summary of privacy posture, with a direct link to the full public policy for legal review.",
    highlights: ["Clerk, storage, and extraction data flows", "Canonical text on /privacy"],
  },
  terms: {
    about:
      "Workspace summary of terms with a link to the full public terms page.",
    highlights: ["Binding language on /terms", "Human review of AI outputs"],
  },
  clerk: {
    about:
      "Clerk powers sign-in, sessions, and the user object you see in Settings. Session state is shared across all Route5 routes.",
    highlights: ["Open Settings from here", "Manage account in Clerk’s dashboard when needed"],
  },
  supabase: {
    about:
      "When your deployment uses cloud Postgres (Supabase), projects and extractions persist there. Otherwise the app uses embedded SQLite on the server—per-user isolation either way.",
    highlights: ["Health shows which backend is active", "Per-user data isolation"],
  },
  openai: {
    about:
      "When intelligence is enabled for your workspace, extractions use the configured model for full structured output. Otherwise a deterministic heuristic still produces a usable digest.",
    highlights: ["Mode shown in health", "Same extraction UI either way"],
  },
};

export function getAppScreenCopy(app: MarketplaceApp): {
  about: string;
  highlights: string[];
} {
  const custom = DETAILS[app.id];
  if (custom) return custom;

  if (app.kind === "roadmap") {
    return {
      about: `${app.subtitle} Route5 doesn’t connect to this system yet—use Learn more for the vendor, or Request to tell us your priority. We ship connectors here first so your desk stays unified.`,
      highlights: [
        "Roadmap — not installed",
        "Request prioritizes our integration queue",
        "Learn more opens the vendor’s site",
      ],
    };
  }

  return {
    about: app.subtitle,
    highlights: ["Included in Route5 workspace", "Tap Open to go there now"],
  };
}
