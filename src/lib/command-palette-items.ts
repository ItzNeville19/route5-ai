import { deskUrl } from "@/lib/desk-routes";

export type WorkspacePaletteProject = { id: string; name: string };

export type PaletteSection =
  | "agent"
  | "activity"
  | "projects"
  | "workspace"
  | "site"
  | "account"
  | "legal";

export type PaletteRecentRun = {
  id: string;
  projectId: string;
  projectName: string;
  snippet: string;
};

export type PaletteItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
  keywords?: string[];
  section: PaletteSection;
};

const LEGAL: PaletteItem[] = [
  {
    id: "privacy",
    label: "Privacy Policy",
    href: "/privacy",
    description: "Full policy — data use and retention",
    keywords: ["privacy", "data", "gdpr"],
    section: "legal",
  },
  {
    id: "security",
    label: "Security · privacy policy",
    href: "/privacy#security",
    description: "TLS, encryption, and security practices",
    keywords: ["security", "encryption", "tls", "trust", "compliance", "soc"],
    section: "legal",
  },
  {
    id: "terms",
    label: "Terms of Service",
    href: "/terms",
    description: "Terms of use",
    keywords: ["terms", "legal"],
    section: "legal",
  },
];

/** Cursor-style: agent + workspace actions first when signed in. */
export function buildPaletteItems(params: {
  signedIn: boolean;
  displayName: string | null;
  projects: WorkspacePaletteProject[];
  recentRuns?: PaletteRecentRun[];
  /** Workspace-wide incomplete actions (Desk queue); sharpens Desk description. */
  openActionsCount?: number;
}): PaletteItem[] {
  const { signedIn, displayName, projects, recentRuns = [], openActionsCount = 0 } = params;

  if (!signedIn) {
    return [
      {
        id: "home",
        label: "Home",
        href: "/",
        description: "Marketing site",
        keywords: ["start", "landing"],
        section: "site",
      },
      {
        id: "product",
        label: "What we ship",
        href: "/product",
        description: "Product overview",
        keywords: ["product", "features", "pitch"],
        section: "site",
      },
      {
        id: "pricing",
        label: "Pricing",
        href: "/pricing",
        description: "Plans",
        keywords: ["plans", "billing"],
        section: "site",
      },
      {
        id: "contact",
        label: "Contact",
        href: "/contact",
        keywords: ["email", "sales"],
        section: "site",
      },
      {
        id: "login",
        label: "Log in",
        href: "/login",
        description: "Sign in",
        keywords: ["sign in", "auth"],
        section: "account",
      },
      {
        id: "signup",
        label: "Create account",
        href: "/sign-up",
        description: "New account",
        keywords: ["register", "sign up"],
        section: "account",
      },
      ...LEGAL,
    ];
  }

  const who = displayName || "You";

  const activity: PaletteItem[] = recentRuns.map((r) => ({
    id: `recent-ex-${r.id}`,
    label: `${r.projectName} · run`,
    href: `/projects/${r.projectId}#ex-${r.id}`,
    description: r.snippet,
    keywords: [
      "recent",
      "extraction",
      "history",
      r.projectName.toLowerCase(),
      r.snippet.slice(0, 40).toLowerCase(),
    ],
    section: "activity",
  }));

  const deskDescription =
    openActionsCount > 0
      ? `${openActionsCount} open action${openActionsCount === 1 ? "" : "s"} — clear the queue on Desk (oldest first)`
      : "Capture operational text — structured passes & commitment queue";

  const agent: PaletteItem[] = [
    {
      id: "desk",
      label: "Desk",
      href: deskUrl(),
      description: deskDescription,
      keywords: [
        "desk",
        "capture",
        "paste",
        "work",
        "create",
        "extract",
        "actions",
        "todo",
        "checklist",
        "queue",
        "follow",
        "commitment",
      ],
      section: "agent",
    },
    {
      id: "overview",
      label: "Overview",
      href: "/overview",
      description: `${who} · commitments, risk & completion`,
      keywords: ["home", "workspace", "overview", "dashboard", "projects", "tracking"],
      section: "agent",
    },
    {
      id: "new-project",
      label: "New project",
      href: "/overview#new-project",
      description: "Workspace for a thread of work · ⌘N",
      keywords: ["create", "add", "project"],
      section: "agent",
    },
    {
      id: "connections",
      label: "Connections",
      href: "/settings#connections",
      description: "Optional API keys (Linear, GitHub, …)",
      keywords: ["integrations", "linear", "github", "api", "connector"],
      section: "agent",
    },
    {
      id: "onboarding",
      label: "Getting started",
      href: "/onboarding",
      description: "Short setup wizard",
      keywords: ["onboarding", "setup", "welcome", "guide", "tutorial"],
      section: "agent",
    },
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      description: "Profile & security",
      keywords: ["account", "profile", "clerk"],
      section: "agent",
    },
  ];

  const projectItems: PaletteItem[] = projects.map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    href: `/projects/${p.id}`,
    description: "Runs, actions & history",
    keywords: ["project", p.name.toLowerCase()],
    section: "projects",
  }));

  const site: PaletteItem[] = [
    {
      id: "plans-inapp",
      label: "Plans",
      href: "/account/plans",
      description: "In-app billing view",
      section: "site",
    },
    {
      id: "pricing-public",
      label: "Pricing (public site)",
      href: "/pricing",
      description: "Marketing pricing page",
      section: "site",
    },
    {
      id: "contact",
      label: "Contact form (public)",
      href: "/contact",
      description: "Opens public contact page",
      section: "site",
    },
    {
      id: "product-scope",
      label: "What we ship (public)",
      href: "/product",
      description: "Product scope — live vs roadmap",
      section: "site",
    },
    {
      id: "home",
      label: "Marketing home",
      href: "/",
      description: "Public site",
      section: "site",
    },
  ];

  const legalSignedIn: PaletteItem[] = [
    {
      id: "doc-privacy",
      label: "Privacy · workspace",
      href: "/docs/privacy",
      description: "Short workspace summary",
      keywords: ["privacy", "docs"],
      section: "legal",
    },
    {
      id: "doc-terms",
      label: "Terms · workspace",
      href: "/docs/terms",
      description: "Short terms summary",
      keywords: ["terms", "docs"],
      section: "legal",
    },
    {
      id: "privacy-public",
      label: "Privacy · full site",
      href: "/privacy",
      description: "Complete privacy policy",
      keywords: ["privacy", "policy"],
      section: "legal",
    },
    {
      id: "security-policy",
      label: "Security · full policy",
      href: "/privacy#security",
      description: "Jump to Security section (encryption, access)",
      keywords: ["security", "encryption", "tls", "trust", "compliance"],
      section: "legal",
    },
    {
      id: "terms-public",
      label: "Terms · full site",
      href: "/terms",
      description: "Complete terms of service",
      keywords: ["terms", "legal"],
      section: "legal",
    },
  ];

  return [...activity, ...agent, ...projectItems, ...site, ...legalSignedIn];
}
