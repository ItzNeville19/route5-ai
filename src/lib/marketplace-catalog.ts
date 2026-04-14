import type { BrandIconId } from "@/components/marketplace/brand-icons";
import { deskUrl } from "@/lib/desk-routes";

export type MarketplaceCategoryId =
  | "all"
  | "built-in"
  | "stack"
  | "ai-engines"
  | "ai-providers"
  | "post-processors"
  | "actions"
  | "memory"
  | "productivity"
  | "collaboration"
  | "data"
  | "enterprise";

export type MarketplaceKind = "native" | "stack" | "roadmap" | "installable";

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
  { id: "ai-engines", label: "Transcription" },
  { id: "ai-providers", label: "LLM Providers" },
  { id: "post-processors", label: "Post-Processors" },
  { id: "actions", label: "Actions" },
  { id: "memory", label: "Memory" },
  { id: "built-in", label: "Built-in" },
  { id: "stack", label: "Your stack" },
  { id: "productivity", label: "Productivity" },
  { id: "collaboration", label: "Collaboration" },
  { id: "data", label: "Data & AI" },
  { id: "enterprise", label: "Enterprise" },
];

/** Native Route5 — real integrations and core workspace routes only (no nav spam). */
export const MARKETPLACE_NATIVE: MarketplaceApp[] = [
  {
    id: "virtual-desk",
    name: "Desk",
    subtitle: "Paste text, run a pass — your main workspace surface.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceHome",
    href: deskUrl(),
  },
  {
    id: "linear",
    name: "Linear",
    subtitle: "Browse issues, import into projects — configure your org for live lists.",
    category: "productivity",
    kind: "native",
    brandId: "linear",
    href: "/integrations/linear",
    manageUrl: "https://linear.app/settings/account",
  },
  {
    id: "github-issues",
    name: "GitHub issues",
    subtitle: "Import by URL or browse samples — same flow as production.",
    category: "data",
    kind: "native",
    brandId: "github",
    href: "/integrations/github",
    manageUrl: "https://github.com/settings/tokens",
  },
  {
    id: "figma",
    name: "Figma",
    subtitle: "Design links and feedback → structured runs on Desk.",
    category: "collaboration",
    kind: "native",
    brandId: "figma",
    href: "/integrations/figma",
    learnMoreUrl: "https://www.figma.com",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    subtitle: "Docs and Calendar context — paste today; OAuth when wired.",
    category: "collaboration",
    kind: "native",
    brandId: "google",
    href: "/integrations/google",
    learnMoreUrl: "https://workspace.google.com",
  },
  {
    id: "integrations-hub",
    name: "Integrations hub",
    subtitle: "Linear, GitHub, and design flows — status and entry points.",
    category: "stack",
    kind: "native",
    brandId: "workspaceHub",
    href: "/integrations",
  },
  {
    id: "intelligence",
    name: "Overview",
    subtitle: "Execution metrics, runs, and project health for your workspace.",
    category: "built-in",
    kind: "native",
    brandId: "route5",
    href: "/projects",
  },
  {
    id: "workspace-reports",
    name: "Reports",
    subtitle: "Workspace counts and recent run activity with links into each project.",
    category: "data",
    kind: "native",
    brandId: "workspaceSparkle",
    href: "/reports",
  },
  {
    id: "workspace-apps",
    name: "Library",
    subtitle: "Installed apps and shortcuts from the workspace.",
    category: "built-in",
    kind: "native",
    brandId: "obsidian",
    href: "/workspace/apps",
  },
  {
    id: "composer",
    name: "New project",
    subtitle: "Open the guided project builder.",
    category: "built-in",
    kind: "native",
    brandId: "workspaceCompose",
    href: "/projects#new-project",
  },
  {
    id: "palette",
    name: "Command palette",
    subtitle: "⌘K — jump anywhere in the workspace.",
    category: "productivity",
    kind: "native",
    brandId: "voice",
    href: "/projects?tool=palette",
  },
  {
    id: "documentation",
    name: "Documentation",
    subtitle: "Product, roadmap, boundaries, and legal.",
    category: "built-in",
    kind: "native",
    brandId: "generic",
    href: "/docs",
  },
  {
    id: "settings",
    name: "Account & AI",
    subtitle: "Profile, security, and workspace AI preferences.",
    category: "built-in",
    kind: "native",
    brandId: "clerk",
    href: "/settings",
    manageUrl: INTEGRATION_MANAGE_URLS.clerk,
  },
  {
    id: "support",
    name: "Support",
    subtitle: "Sales, integrations, and help.",
    category: "enterprise",
    kind: "native",
    brandId: "generic",
    href: "/support",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    subtitle: "Browse this catalog — integrations, stack, and providers.",
    category: "built-in",
    kind: "native",
    brandId: "mcp",
    href: "/marketplace",
  },
];

/** Live stack — links go to real consoles; status reflects workspace readiness. */
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
    subtitle: "Smarter passes when AI is on — offline pass always available.",
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
    subtitle: "Channel context → Desk runs (planned).",
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
];

/** Installable AI engines, providers, post-processors, actions, and memory. */
export const MARKETPLACE_INSTALLABLE: MarketplaceApp[] = [
  // ── Transcription engines ──
  {
    id: "whisperkit",
    name: "WhisperKit",
    subtitle: "Local speech-to-text. 7 model sizes, 99 languages, streaming. Runs fully on-device.",
    category: "ai-engines",
    kind: "installable",
    brandId: "whisper",
    href: "/settings",
    learnMoreUrl: "https://github.com/argmaxinc/WhisperKit",
  },
  {
    id: "whisperkit-large-v3",
    name: "WhisperKit Large v3",
    subtitle: "Highest accuracy model — 1.5 GB. Best for long-form and noisy audio.",
    category: "ai-engines",
    kind: "installable",
    brandId: "whisper",
    href: "/settings",
  },
  {
    id: "whisperkit-small",
    name: "WhisperKit Small",
    subtitle: "Fast 244 MB model for quick notes and low-latency dictation.",
    category: "ai-engines",
    kind: "installable",
    brandId: "whisper",
    href: "/settings",
  },
  {
    id: "apple-speech",
    name: "Apple Speech",
    subtitle: "On-device recognition using Apple's Speech framework. macOS 26+, streaming, free.",
    category: "ai-engines",
    kind: "installable",
    brandId: "apple",
    href: "/settings",
    learnMoreUrl: "https://developer.apple.com/documentation/speech",
  },
  {
    id: "nvidia-parakeet",
    name: "NVIDIA Parakeet",
    subtitle: "State-of-the-art ASR from NVIDIA NeMo. Runs locally on Apple Silicon via CoreML.",
    category: "ai-engines",
    kind: "installable",
    brandId: "parakeet",
    href: "/settings",
    learnMoreUrl: "https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/intro.html",
  },
  {
    id: "groq-asr",
    name: "Groq",
    subtitle: "Cloud transcription and LLM via Groq API. Blazing inference, requires free API key.",
    category: "ai-engines",
    kind: "installable",
    brandId: "groq",
    href: "/settings",
    learnMoreUrl: "https://console.groq.com",
    manageUrl: "https://console.groq.com/keys",
  },
  {
    id: "qwen3-asr-3b-4bit",
    name: "Qwen3 ASR 3.0B 4-bit",
    subtitle: "Local MLX on Apple Silicon. 30 languages, ~2 GB RAM. No API key required.",
    category: "ai-engines",
    kind: "installable",
    brandId: "qwen",
    href: "/settings",
    learnMoreUrl: "https://huggingface.co/Qwen",
  },
  {
    id: "qwen3-asr-3b-8bit",
    name: "Qwen3 ASR 3.0B 8-bit",
    subtitle: "Higher precision, ~4 GB RAM. Better accuracy for complex audio.",
    category: "ai-engines",
    kind: "installable",
    brandId: "qwen",
    href: "/settings",
  },
  {
    id: "qwen3-asr-1.7b-4bit",
    name: "Qwen3 ASR 1.7B 4-bit",
    subtitle: "Lightweight model — ~1 GB RAM. Fast and efficient for short notes.",
    category: "ai-engines",
    kind: "installable",
    brandId: "qwen",
    href: "/settings",
  },
  {
    id: "qwen3-asr-1.7b-8bit",
    name: "Qwen3 ASR 1.7B 8-bit",
    subtitle: "1.7B at 8-bit precision — ~2 GB RAM. Good balance of speed and accuracy.",
    category: "ai-engines",
    kind: "installable",
    brandId: "qwen",
    href: "/settings",
  },
  {
    id: "openai-whisper",
    name: "OpenAI Whisper",
    subtitle: "Cloud transcription and LLM via OpenAI API. Whisper and GPT models, requires API key.",
    category: "ai-engines",
    kind: "installable",
    brandId: "openai",
    href: "/settings",
    manageUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "openai-compatible",
    name: "OpenAI Compatible",
    subtitle: "Connect to any OpenAI-compatible API server. Works with Ollama, LM Studio, vLLM, and more.",
    category: "ai-engines",
    kind: "installable",
    brandId: "openai",
    href: "/settings",
  },
  {
    id: "voxtral-mlx",
    name: "Voxtral MLX",
    subtitle: "Local speech-to-text powered by Voxtral MLX on Apple Silicon. Fast and accurate.",
    category: "ai-engines",
    kind: "installable",
    brandId: "voxtral",
    href: "/settings",
    learnMoreUrl: "https://mistral.ai",
  },
  {
    id: "cloudflare-asr",
    name: "Cloudflare ASR",
    subtitle: "Edge transcription via Cloudflare Workers AI. Low-latency, no cold starts.",
    category: "ai-engines",
    kind: "installable",
    brandId: "cloudflare",
    href: "/settings",
    learnMoreUrl: "https://developers.cloudflare.com/workers-ai/models/automatic-speech-recognition/",
  },
  {
    id: "ibm-granite-speech",
    name: "IBM Granite Speech",
    subtitle: "IBM Research speech models (vendor capabilities vary; configure in your deployment).",
    category: "ai-engines",
    kind: "installable",
    brandId: "granite",
    href: "/settings",
    learnMoreUrl: "https://www.ibm.com/granite",
  },

  // ── LLM Providers ──
  {
    id: "openai-llm",
    name: "OpenAI GPT",
    subtitle: "GPT-4o, GPT-4, GPT-3.5 Turbo. Best for grammar correction and style matching. API key required.",
    category: "ai-providers",
    kind: "installable",
    brandId: "openai",
    href: "/settings",
    manageUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "groq-llm",
    name: "Groq LLM",
    subtitle: "Groq-hosted Llama, Mixtral, and Gemma. Free tier available with API key.",
    category: "ai-providers",
    kind: "installable",
    brandId: "groq",
    href: "/settings",
    manageUrl: "https://console.groq.com/keys",
  },
  {
    id: "cloudflare-ai",
    name: "Cloudflare Workers AI",
    subtitle: "Run Llama, Mistral, and more at the edge. No cold starts, pay-per-token.",
    category: "ai-providers",
    kind: "installable",
    brandId: "cloudflare",
    href: "/settings",
    learnMoreUrl: "https://developers.cloudflare.com/workers-ai/",
  },
  {
    id: "ibm-granite-llm",
    name: "IBM Granite LLM",
    subtitle: "IBM Granite models for code, chat, and documents — subject to IBM terms and your configuration.",
    category: "ai-providers",
    kind: "installable",
    brandId: "ibm",
    href: "/settings",
    learnMoreUrl: "https://www.ibm.com/granite",
  },
  {
    id: "huggingface-hub",
    name: "Hugging Face Hub",
    subtitle: "Access thousands of models. Optional token for increased rate limits and private models.",
    category: "ai-providers",
    kind: "installable",
    brandId: "huggingface",
    href: "/settings",
    manageUrl: "https://huggingface.co/settings/tokens",
  },

  // ── Post-Processors ──
  {
    id: "webhook-notifications",
    name: "Webhook Notifications",
    subtitle: "Send transcribed or processed text to any webhook URL via HTTP POST.",
    category: "post-processors",
    kind: "installable",
    brandId: "generic",
    href: "/settings",
  },
  {
    id: "script-runner",
    name: "Script Runner",
    subtitle: "Post-process transcribed text through custom shell scripts. Pass text via stdin, get results via stdout.",
    category: "post-processors",
    kind: "installable",
    brandId: "onprem",
    href: "/settings",
  },

  // ── Actions ──
  {
    id: "linear-action",
    name: "Linear Action",
    subtitle: "Create Linear issues from transcribed or processed text. Requires a Linear API key.",
    category: "actions",
    kind: "installable",
    brandId: "linear",
    href: "/integrations/linear",
    manageUrl: "https://linear.app/settings/account",
  },
  {
    id: "obsidian-export",
    name: "Obsidian",
    subtitle: "Save transcriptions to your Obsidian vault as Markdown notes. Daily notes, front matter, auto-export.",
    category: "actions",
    kind: "installable",
    brandId: "obsidian",
    href: "/settings",
    learnMoreUrl: "https://obsidian.md",
  },

  // ── Memory ──
  {
    id: "openai-vector-memory",
    name: "OpenAI Vector Memory",
    subtitle: "Store and search memories using the OpenAI Vector Store API with semantic embeddings.",
    category: "memory",
    kind: "installable",
    brandId: "openai",
    href: "/settings",
    manageUrl: "https://platform.openai.com",
  },
];

export const ALL_MARKETPLACE_APPS: MarketplaceApp[] = [
  ...MARKETPLACE_NATIVE,
  ...MARKETPLACE_STACK,
  ...MARKETPLACE_INSTALLABLE,
  ...MARKETPLACE_ROADMAP,
];

/** Ordered picks for Overview footer — one tile per `brandId` so icons never duplicate in the strip. */
const OVERVIEW_SHOWCASE_IDS = [
  "virtual-desk",
  "linear",
  "github-issues",
  "figma",
  "google-workspace",
  "slack",
  "notion",
  "clerk",
  "supabase",
  "openai",
  "groq-llm",
  "cloudflare-ai",
  "huggingface-hub",
  "jira",
  "teams",
  "intelligence",
  "marketplace",
] as const;

export function marketplaceOverviewShowcaseApps(): MarketplaceApp[] {
  const byId = new Map(ALL_MARKETPLACE_APPS.map((a) => [a.id, a]));
  const picks: MarketplaceApp[] = [];
  for (const id of OVERVIEW_SHOWCASE_IDS) {
    const a = byId.get(id);
    if (a) picks.push(a);
  }
  const seen = new Set<BrandIconId>();
  const out: MarketplaceApp[] = [];
  for (const a of picks) {
    if (seen.has(a.brandId)) continue;
    seen.add(a.brandId);
    out.push(a);
  }
  return out.slice(0, 14);
}

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
  "linear",
  "github-issues",
  "figma",
  "google-workspace",
  "integrations-hub",
  "intelligence",
  "workspace-reports",
  "workspace-apps",
  "composer",
  "palette",
  "documentation",
  "settings",
  "support",
  "marketplace",
];

const ROADMAP_BROWSE_ORDER = [
  "slack",
  "teams",
  "notion",
  "jira",
  "mcp",
  "sso",
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

export function marketplaceInstallableBrowseOrdered(): MarketplaceApp[] {
  return [...MARKETPLACE_INSTALLABLE];
}

export function installableBySection(): {
  label: string;
  categoryId: MarketplaceCategoryId;
  count: number;
  apps: MarketplaceApp[];
}[] {
  const sections: { label: string; categoryId: MarketplaceCategoryId }[] = [
    { label: "Transcription Engines", categoryId: "ai-engines" },
    { label: "LLM Providers", categoryId: "ai-providers" },
    { label: "Post-Processors", categoryId: "post-processors" },
    { label: "Actions", categoryId: "actions" },
    { label: "Memory", categoryId: "memory" },
  ];
  return sections
    .map((s) => {
      const apps = MARKETPLACE_INSTALLABLE.filter(
        (a) => a.category === s.categoryId
      );
      return { ...s, count: apps.length, apps };
    })
    .filter((s) => s.apps.length > 0);
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
    const catLabel =
      MARKETPLACE_CATEGORIES.find((c) => c.id === app.category)?.label ?? "";
    return (
      app.name.toLowerCase().includes(q) ||
      app.subtitle.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q) ||
      app.brandId.toLowerCase().includes(q) ||
      catLabel.toLowerCase().includes(q)
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
