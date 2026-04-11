import type { MarketplaceApp } from "@/lib/marketplace-catalog";

/** App Store–style detail copy — full “about” for the launch screen. */
const DETAILS: Record<string, { about: string; highlights: string[] }> = {
  "virtual-desk": {
    about:
      "Your desk: a single capture surface for paste-in extractions, templates, and shortcuts to Linear, GitHub, Figma, and the marketplace. Less hunting — more shipping.",
    highlights: [
      "Chat-style capture tied to any project",
      "Templates for meeting, incident, design review, and more",
      "Recent extractions and one-tap jumps to integrations",
    ],
  },
  figma: {
    about:
      "Use Figma the way teams actually work: copy comments and frame context, paste on your desk, and run a structured design extraction — no connector required to get value.",
    highlights: [
      "Design preset + file links in one flow",
      "Opens alongside the rest of your Route5 projects",
      "Optional: open Figma in the browser while you capture",
    ],
  },
  composer: {
    about:
      "Create projects from the first line of text and optional notes. The composer is the fastest way to stand up a new workspace container before you paste real input.",
    highlights: ["First line becomes the project name", "⌘↵ creates and opens the project"],
  },
  intelligence: {
    about:
      "Each extraction run produces a summary, decisions, and checkable actions—structured output on top of pasted text, saved per project.",
    highlights: ["Export any run as Markdown", "Mark actions complete when done"],
  },
  linear: {
    about:
      "Pulls live issue context from Linear into Route5 so you can run structured extractions on real work. No fake sync toggles—your deployment connects the service once; teams just use it.",
    highlights: [
      "Recent issues and import by URL or TEAM-123",
      "One tap → copy → paste into project extraction",
      "Same session as the rest of the workspace",
    ],
  },
  "github-issues": {
    about:
      "Lists issues assigned to your connected GitHub identity and imports any issue by URL or owner/repo#number into the extraction composer—formatted for Route5 runs.",
    highlights: [
      "Assigned issues across repos you use",
      "Import by issue URL or owner/repo#number",
      "Flows into the same projects and history as everything else",
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
  health: {
    about:
      "Opens the integrations hub — Desk, Linear, GitHub, Figma, and Google routes live there. For raw stack diagnostics, GET /api/health returns storage mode and connector flags (no secrets).",
    highlights: [
      "Every wired connector from one place",
      "Same story as the Connections card in the sidebar",
    ],
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
