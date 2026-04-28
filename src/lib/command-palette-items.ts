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

export type PaletteSearchCommitment = {
  id: string;
  title: string;
  ownerName: string;
  projectId: string | null;
  projectName: string | null;
  deadline: string;
  priority: string;
  status: string;
  searchText: string;
};

export type PalettePerson = {
  id: string;
  name: string;
  email: string | null;
};

export type PaletteItem = {
  id: string;
  label: string;
  /** Navigation target; omit when `action` is set. */
  href?: string;
  /** Non-navigation palette actions. */
  action?: "open-capture" | "open-new-project" | "open-new-task";
  description?: string;
  keywords?: string[];
  section: PaletteSection;
};

const LIVE_ROUTE_PREFIXES = [
  "/",
  "/account",
  "/capture",
  "/contact",
  "/desk",
  "/docs",
  "/feed",
  "/integrations",
  "/login",
  "/marketplace",
  "/onboarding",
  "/overview",
  "/pricing",
  "/privacy",
  "/product",
  "/companies",
  "/projects",
  "/settings",
  "/sign-up",
  "/support",
  "/terms",
  "/workspace",
] as const;

function isLivePaletteHref(href: string): boolean {
  const clean = href.split("#")[0]?.split("?")[0] ?? href;
  if (!clean.startsWith("/")) return false;
  return LIVE_ROUTE_PREFIXES.some(
    (prefix) => clean === prefix || (prefix !== "/" && clean.startsWith(`${prefix}/`))
  );
}

function filterLivePaletteItems(items: PaletteItem[]): PaletteItem[] {
  return items.filter((item) => !item.href || isLivePaletteHref(item.href));
}

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
  searchCommitments?: PaletteSearchCommitment[];
  people?: PalettePerson[];
  /** Workspace-wide incomplete actions (Desk queue); sharpens Desk description. */
  openActionsCount?: number;
  /** When false, omits the “Add company” palette action (e.g. member role). */
  canCreateCompany?: boolean;
  /** Admin / manager — hides Agent-adjacent workspace shortcuts for IC roles. */
  canWorkspaceLead?: boolean;
}): PaletteItem[] {
  const {
    signedIn,
    displayName,
    projects,
    recentRuns = [],
    searchCommitments = [],
    people = [],
    openActionsCount = 0,
    canCreateCompany = true,
    canWorkspaceLead = true,
  } = params;

  if (!signedIn) {
    return filterLivePaletteItems([
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
        label: "Product",
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
    ]);
  }

  const who = displayName || "You";

  const activity: PaletteItem[] = recentRuns.map((r) => ({
    id: `recent-ex-${r.id}`,
    label: `${r.projectName} · recent update`,
    href: `/companies/${r.projectId}#ex-${r.id}`,
    description: r.snippet,
    keywords: [
      "recent",
      "capture",
      "history",
      r.projectName.toLowerCase(),
      r.snippet.slice(0, 40).toLowerCase(),
    ],
    section: "activity",
  }));

  const commitmentItems: PaletteItem[] = canWorkspaceLead
    ? searchCommitments.map((c) => ({
        id: `commitment-${c.id}`,
        label: c.title,
        href: `/workspace/commitments?id=${encodeURIComponent(c.id)}`,
        description: `${c.ownerName}${c.projectName ? ` · ${c.projectName}` : ""} · ${c.priority} · due ${new Date(c.deadline).toLocaleDateString()}`,
        keywords: [
          "commitment",
          c.ownerName.toLowerCase(),
          (c.projectName ?? "").toLowerCase(),
          c.status.toLowerCase(),
          c.priority.toLowerCase(),
          c.searchText.slice(0, 320).toLowerCase(),
        ],
        section: "activity",
      }))
    : [];

  const peopleItems: PaletteItem[] = people.map((p) => ({
    id: `person-${p.id}`,
    label: p.name,
    href: "/workspace/organization",
    description: p.email ? `Owner · ${p.email}` : "Owner",
    keywords: ["owner", "person", "assignee", p.name.toLowerCase(), (p.email ?? "").toLowerCase()],
    section: "account",
  }));

  const deskDescription =
    openActionsCount > 0
      ? `${openActionsCount} open action${openActionsCount === 1 ? "" : "s"} — clear the queue on Desk (oldest first)`
      : "Capture operational text and convert it into tracked commitments";

  /** Primary rail lives in the sidebar; these are the “everywhere else” shortcuts. */
  const agent: PaletteItem[] = [
    {
      id: "desk-home",
      label: "Desk",
      href: "/desk",
      description: `${who} · commitments and execution (primary workspace)`,
      keywords: ["desk", "feed", "home", "commitments", "tasks", "tracking", "workspace"],
      section: "agent",
    },
    {
      id: "projects-index",
      label: "Companies",
      href: "/companies",
      description: "All companies in your workspace",
      keywords: ["companies", "projects", "list", "hub", "accounts"],
      section: "agent",
    },
    {
      id: "workspace-team",
      label: "Team",
      href: "/workspace/organization",
      description: "Org switcher & people who own commitments",
      keywords: ["team", "collaborators", "people", "members", "clerk", "organization"],
      section: "agent",
    },
    {
      id: "guided-tour",
      label: "Guided tour",
      href: "/workspace/dashboard?tour=1",
      description: "Replay the workspace walkthrough",
      keywords: ["onboarding", "setup", "welcome", "guide", "tutorial", "tour"],
      section: "agent",
    },
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      description: "Account, language, timezone, location, notifications, and integrations",
      keywords: [
        "account",
        "profile",
        "clerk",
        "settings",
        "language",
        "locale",
        "timezone",
        "location",
        "region",
        "city",
        "country",
        "preferences",
        "i18n",
        "translation",
      ],
      section: "agent",
    },
    {
      id: "help-hub",
      label: "Help & tutorials",
      href: "/workspace/help",
      description: "Onboarding replay, shortcuts, and integrations",
      keywords: ["help", "tutorial", "onboarding", "replay", "support", "guide", "learn"],
      section: "agent",
    },
  ];

  /**
   * Not in the slim sidebar — type ⌘K and search (Feed, Capture, Marketplace, themes…).
   */
  const workspaceHidden: PaletteItem[] = [
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
        "analyze",
        "actions",
        "todo",
        "checklist",
        "queue",
        "commitment",
        "operational",
        "review",
      ],
      section: "workspace",
    },
    {
      id: "leadership",
      label: "Leadership / Overview",
      href: "/overview",
      description: `Execution health & team load — same “Overview” screen (${who})`,
      keywords: [
        "leadership",
        "overview",
        "dashboard",
        "ceo",
        "risk",
        "metrics",
        "morning",
        "command",
        "health",
        "load",
        "old",
        "screen",
      ],
      section: "workspace",
    },
    {
      id: "new-task",
      label: "Add task",
      action: "open-new-task",
      description: "Create a task in the org tracker (due date, company, owner)",
      keywords: ["create", "add", "task", "commitment", "todo", "new"],
      section: "workspace",
    },
    {
      id: "new-project",
      label: "Add company",
      action: "open-new-project",
      description: "Create a new workspace company",
      keywords: ["create", "add", "company", "project", "workstream", "new"],
      section: "workspace",
    },
    {
      id: "integrations-hub-public",
      label: "Integrations directory",
      href: "/integrations",
      description: "Connectors — Linear, Google, Slack, GitHub, and more",
      keywords: ["integrations", "linear", "github", "api", "connector", "connections", "hub"],
      section: "workspace",
    },
    {
      id: "customize-quick",
      label: "Customize workspace",
      href: "/workspace/customize",
      description: "Themes, appearance, mesh & layout",
      keywords: [
        "customize",
        "customization",
        "customise",
        "personalize",
        "personalization",
        "branding",
        "look and feel",
        "themes",
        "appearance",
        "layout",
        "palette",
        "dark",
        "light",
      ],
      section: "workspace",
    },
    {
      id: "marketplace-quick",
      label: "Marketplace",
      href: "/marketplace",
      description: "Extensions, connectors, and catalog",
      keywords: ["marketplace", "apps", "plugins", "catalog", "store", "library", "browse"],
      section: "workspace",
    },
    {
      id: "workspace-commitments",
      label: "Commitments",
      href: "/workspace/commitments",
      description: "Org commitments table",
      keywords: ["commitments", "table", "tracker"],
      section: "workspace",
    },
    {
      id: "audit",
      label: "Audit log",
      href: "/workspace/audit",
      description: "Workspace audit history",
      keywords: ["audit", "log", "history", "compliance"],
      section: "workspace",
    },
    {
      id: "integrations-hub",
      label: "Integration status",
      href: "/workspace/integrations",
      description: "Org-level connector readiness vs. the public Integrations directory",
      keywords: ["integrations", "connectors", "linear", "github", "slack"],
      section: "workspace",
    },
    {
      id: "notifications-prefs",
      label: "Notifications",
      href: "/workspace/notifications/preferences",
      description: "Digest and notification preferences",
      keywords: ["notifications", "digest", "email", "alerts"],
      section: "workspace",
    },
    {
      id: "settings-language-timezone",
      label: "Settings — Language & timezone",
      href: "/settings#workspace-lang",
      description: "Interface language (system default) and IANA timezone",
      keywords: [
        "language",
        "locale",
        "timezone",
        "time zone",
        "region",
        "location",
        "city",
        "country",
        "preferences",
        "i18n",
        "translation",
      ],
      section: "workspace",
    },
    {
      id: "settings-notifications-anchor",
      label: "Settings — Notification entry",
      href: "/settings#settings-notifications",
      description: "Jump to notification settings on the main Settings page",
      keywords: ["notifications", "email", "alerts", "digest", "bell", "preferences"],
      section: "workspace",
    },
    {
      id: "billing",
      label: "Billing",
      href: "/workspace/billing",
      description: "Invoices and payment method",
      keywords: ["billing", "invoice", "payment"],
      section: "workspace",
    },
  ];

  const LEAD_ONLY_WORKSPACE_IDS = new Set([
    "new-task",
    "audit",
    "workspace-commitments",
    "integrations-hub",
  ]);

  const workspaceRail = canWorkspaceLead
    ? workspaceHidden
    : workspaceHidden.filter((item) => !LEAD_ONLY_WORKSPACE_IDS.has(item.id));

  const projectItems: PaletteItem[] = projects.map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    href: `/companies/${p.id}`,
    description: "Tasks, updates, and history",
    keywords: ["company", "project", p.name.toLowerCase()],
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
      label: "Product (public site)",
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

  const list = filterLivePaletteItems([
    ...activity,
    ...commitmentItems,
    ...agent,
    ...workspaceRail,
    ...projectItems,
    ...peopleItems,
    ...site,
    ...legalSignedIn,
  ]);
  const blockedHrefPrefixes = [
    "/capture",
    "/workspace/commitments",
    "/workspace/org-feed",
    "/workspace/dashboard",
    "/workspace/assign-task",
    "/workspace/team-work",
    "/workspace/team",
    "/workspace/billing",
    "/workspace/apps",
    "/workspace/developer",
    "/workspace/escalations",
    "/workspace/audit",
    "/workspace/integrations",
    "/workspace/digest",
    "/workspace/my-inbox",
  ];
  const mvpList = list.filter((item) => {
    if (item.action === "open-capture" || item.action === "open-new-task") return false;
    const href = item.href;
    if (!href) return true;
    return !blockedHrefPrefixes.some(
      (prefix) => href === prefix || href.startsWith(`${prefix}/`)
    );
  });
  if (!canCreateCompany) {
    return mvpList.filter((item) => item.id !== "new-project");
  }
  return mvpList;
}
