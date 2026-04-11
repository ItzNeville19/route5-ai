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
    section: "legal",
  },
  {
    id: "terms",
    label: "Terms of Service",
    href: "/terms",
    section: "legal",
  },
];

/** Cursor-style: agent + workspace actions first when signed in. */
export function buildPaletteItems(params: {
  signedIn: boolean;
  displayName: string | null;
  projects: WorkspacePaletteProject[];
  recentRuns?: PaletteRecentRun[];
}): PaletteItem[] {
  const { signedIn, displayName, projects, recentRuns = [] } = params;

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
        id: "pitch",
        label: "What we ship",
        href: "/pitch",
        description: "Product overview",
        keywords: ["product", "features"],
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

  const agent: PaletteItem[] = [
    {
      id: "desk",
      label: "Desk",
      href: "/desk",
      description: "Capture, templates, extractions",
      keywords: ["desk", "capture", "paste", "chat", "create", "home"],
      section: "agent",
    },
    {
      id: "dash",
      label: "Dashboard",
      href: "/projects",
      description: `${who} · projects & stats`,
      keywords: ["home", "workspace", "overview", "projects"],
      section: "agent",
    },
    {
      id: "reports",
      label: "Reports",
      href: "/reports",
      description: "Counts & recent extractions",
      keywords: ["reports", "stats", "activity", "runs", "export"],
      section: "agent",
    },
    {
      id: "new-project",
      label: "New project",
      href: "/projects#new-project",
      description: "Create · ⌘N",
      keywords: ["create", "add", "project"],
      section: "agent",
    },
    {
      id: "marketplace",
      label: "Marketplace",
      href: "/marketplace",
      description: "Integrations & status",
      keywords: ["integrations", "apps", "connect", "marketplace"],
      section: "agent",
    },
    {
      id: "integrations",
      label: "Integrations",
      href: "/integrations",
      description: "Linear, GitHub, and more",
      keywords: ["linear", "github", "connectors", "import"],
      section: "agent",
    },
    {
      id: "onboarding",
      label: "Getting started",
      href: "/onboarding",
      description: "Interactive setup wizard",
      keywords: ["onboarding", "setup", "welcome", "guide", "tutorial"],
      section: "agent",
    },
    {
      id: "docs",
      label: "Documentation",
      href: "/docs",
      description: "Product, roadmap, legal",
      keywords: ["docs", "help", "scope", "roadmap"],
      section: "agent",
    },
    {
      id: "support",
      label: "Support",
      href: "/support",
      description: "Contact & priorities",
      keywords: ["help", "contact", "sales"],
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
    description: "Open project workspace",
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
      id: "pitch",
      label: "What we ship",
      href: "/docs/product",
      description: "In-app product scope",
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
      section: "legal",
    },
    {
      id: "doc-terms",
      label: "Terms · workspace",
      href: "/docs/terms",
      section: "legal",
    },
    {
      id: "privacy-public",
      label: "Privacy · full site",
      href: "/privacy",
      section: "legal",
    },
    {
      id: "terms-public",
      label: "Terms · full site",
      href: "/terms",
      section: "legal",
    },
  ];

  return [...activity, ...agent, ...projectItems, ...site, ...legalSignedIn];
}
