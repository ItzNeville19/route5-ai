/** Personalized greeting — taglines rotate by calendar day, not only “new user” copy. */

import { deskUrl } from "@/lib/desk-routes";
import type { WorkspaceConnectorReadiness, RecentExtractionRow } from "@/lib/workspace-summary";
import { formatClockInTimezone, hourInTimezone } from "@/lib/timezone-date";
import { getDisplayLocationLabel } from "@/lib/workspace-regions";
import { seededShuffle, stableHash } from "@/lib/stable-hash";

const TAGLINES = [
  "Commitments with owners — not lost between meetings.",
  "Program delivery: capture, pass, complete.",
  "Audit-friendly history from what you actually saved.",
  "Named next steps per client or program.",
  "Less scrollback. More proof of follow-through.",
  "Structured runs. Honest completion metrics.",
  "The handoff layer: messy text → checklists.",
  "Where operational notes become owned work.",
] as const;

/** Short tips for welcome surfaces — kept concise; Overview hero omits these when you’re in a good state. */
const WHATS_NEXT = [
  "Pin active programs or accounts in the sidebar.",
  "⌘K searches routes and projects.",
  "Desk is the fastest place to paste and run.",
] as const;

export type WelcomePack = {
  greeting: string;
  title: string;
  tagline: string;
  altTagline: string;
};

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type WorkspaceInsightContext = {
  projectCount: number;
  extractionCount: number;
  readiness: WorkspaceConnectorReadiness | null;
  /** Most recent extraction (for deep links like duplicate / continue). */
  latestExtraction?: Pick<RecentExtractionRow, "id" | "projectId" | "projectName" | "summarySnippet"> | null;
};

/**
 * One line that rotates daily and reacts to what you’re doing — shown under the hero headline
 * when you haven’t set a custom Overview subtitle.
 */
const FIRST_PROJECT_LINES = [
  "Name a client, program, or account first — every run and action stays scoped there.",
  "Route5 tracks commitments from your text — start by naming the program or contract thread.",
] as const;

const FIRST_RUN_LINES = [
  "Open Desk, paste QBR notes or an escalation thread, and run one pass to unlock metrics here.",
  "One run is enough — you’ll see completion rate, aging actions, and activity on this Overview.",
] as const;

const OPENAI_HINTS = [
  "Tune AI under Settings → AI & passes — hosted Route5 uses the platform model when your deployment configures it.",
  "Prefer structured runs? Set AI defaults in Settings; no API key needed in the app for hosted workspaces.",
] as const;

/**
 * Short subline under the greeting — **null** when there’s nothing essential to say
 * (no random product tips; avoids clutter on Overview).
 */
export function getOverviewSubline(
  ctx: WorkspaceInsightContext,
  userId: string | undefined
): string | null {
  const seed = stableHash(`${userId ?? "anon"}:${dayKey()}:insight`);
  const dayMix = stableHash(`${userId ?? "anon"}:${dayKey()}:mix`);

  if (ctx.projectCount === 0) {
    return FIRST_PROJECT_LINES[(seed + dayMix) % FIRST_PROJECT_LINES.length]!;
  }
  if (ctx.extractionCount === 0) {
    return FIRST_RUN_LINES[(seed + dayMix) % FIRST_RUN_LINES.length]!;
  }
  if (!ctx.readiness?.openai) {
    return OPENAI_HINTS[(seed + dayMix) % OPENAI_HINTS.length]!;
  }

  return null;
}

const HEALTHY_ROTATIONS = [
  (c: WorkspaceInsightContext) =>
    `${c.extractionCount} run${c.extractionCount === 1 ? "" : "s"} across ${c.projectCount} project${c.projectCount === 1 ? "" : "s"}.`,
  (c: WorkspaceInsightContext) =>
    `Workspace: ${c.projectCount} project${c.projectCount === 1 ? "" : "s"}, ${c.extractionCount} saved run${c.extractionCount === 1 ? "" : "s"}.`,
  (c: WorkspaceInsightContext) =>
    c.extractionCount > 0 ? `${c.extractionCount} structured runs in your history.` : null,
  () => "Pin active delivery work in the sidebar.",
  () => "⌘K jumps to projects and routes.",
  () => "Desk is the fastest place to capture and run.",
] as const;

/**
 * Rotating Overview subtitle (no manual “company note” on the hero — changes like the headline).
 */
export function getOverviewHeroSubtitle(
  ctx: WorkspaceInsightContext,
  userId: string | undefined,
  timezone?: string
): string {
  const hour = hourInTimezone(timezone);
  const seed = stableHash(`${userId ?? "anon"}:${dayKey()}:${hour}:subtitle`);
  const mix = stableHash(`${userId ?? "anon"}:${dayKey()}:submix`);

  if (ctx.projectCount === 0) {
    return FIRST_PROJECT_LINES[(seed + mix) % FIRST_PROJECT_LINES.length]!;
  }
  if (ctx.extractionCount === 0) {
    return FIRST_RUN_LINES[(seed + mix) % FIRST_RUN_LINES.length]!;
  }
  if (!ctx.readiness?.openai) {
    return OPENAI_HINTS[(seed + mix) % OPENAI_HINTS.length]!;
  }

  const pool: string[] = [];
  for (const line of HEALTHY_ROTATIONS) {
    const s = line(ctx);
    if (s) pool.push(s);
  }
  const idx = (seed + mix) % pool.length;
  return pool[idx]!;
}

/** @deprecated Prefer {@link getOverviewSubline} — returns empty string when null for legacy callers. */
export function getDailyWorkspaceInsight(
  ctx: WorkspaceInsightContext,
  userId: string | undefined
): string {
  return getOverviewSubline(ctx, userId) ?? "";
}

export function getWorkspaceWelcome(displayName: string, userId: string | undefined): WelcomePack {
  const name = displayName.trim() || "there";
  const seed = `${userId ?? "anon"}:${dayKey()}`;
  const h = stableHash(seed);
  const i = (h >> 8) % TAGLINES.length;
  const j = (h >> 4) % WHATS_NEXT.length;
  return {
    greeting: "Welcome back",
    title: `Welcome back, ${name}`,
    tagline: TAGLINES[i]!,
    /** Rotates daily — not only “first run” tips. */
    altTagline: WHATS_NEXT[j]!,
  };
}

/**
 * Hero title — driven by time of day in the user’s workspace timezone, with a little daily variety.
 */
export function getHeroHeadline(
  first: string,
  userId: string | undefined,
  timezone?: string
): string {
  const hour = hourInTimezone(timezone);
  const f = first.trim() || "there";
  /** Band follows the clock; phrase index follows the calendar day (new line each morning, stable all day). */
  const dayMix = stableHash(`${dayKey()}:heroRotate`);
  const idxBase = stableHash(`${userId ?? "anon"}:${dayKey()}:hero`);

  /** 12 a.m.–4:59 a.m. — daily briefing tone, not “late night” copy. */
  let band: "early" | "morning" | "afternoon" | "evening" | "late";
  if (hour < 5) band = "early";
  else if (hour < 12) band = "morning";
  else if (hour < 17) band = "afternoon";
  else if (hour < 22) band = "evening";
  else band = "late";

  const early = [
    `Early morning, ${f}`,
    `Before five — ${f}`,
    `Your day starts here — ${f}`,
    `Still dark out — ${f}`,
    `Pre-dawn focus — ${f}`,
    `Quiet hours, ${f}`,
    `${f}, early session`,
    `First light soon — ${f}`,
    `Daily briefing — ${f}`,
    `Up before sunrise — ${f}`,
    `Coffee optional — ${f}`,
    `Before the rush — ${f}`,
  ];
  const morning = [
    `Good morning, ${f}`,
    `Morning, ${f}`,
    `Ready when you are — ${f}`,
    `Fresh start, ${f}`,
    `Here we go — ${f}`,
    `${f}, your workspace is ready`,
    `Nice to see you this morning, ${f}`,
    `Up and at it — ${f}`,
    `Morning light — ${f}`,
    `Let’s make progress, ${f}`,
    `Easy pace — ${f}`,
    `New day, ${f}`,
    `Off to a good start — ${f}`,
    `Glad you’re here — ${f}`,
  ];
  const afternoon = [
    `Good afternoon, ${f}`,
    `Hey ${f}`,
    `Hi ${f} — good to see you`,
    `${f}, hope the day’s treating you well`,
    `Carrying on — ${f}`,
    `Still in flow — ${f}`,
    `Middle of the day — ${f}`,
    `${f}, you’re dialed in`,
    `Afternoon check-in — ${f}`,
    `Keeping pace — ${f}`,
    `Here when you need it — ${f}`,
    `Back at it — ${f}`,
    `Solid afternoon, ${f}`,
    `Quick hello — ${f}`,
  ];
  const evening = [
    `Good evening, ${f}`,
    `Evening, ${f}`,
    `Winding down — ${f}`,
    `${f}, still going strong`,
    `Almost there — ${f}`,
    `Golden hour — ${f}`,
    `Evening stretch — ${f}`,
    `${f}, one more pass?`,
    `Night shift — ${f}`,
    `Easy does it — ${f}`,
  ];
  const late = [
    `Welcome back, ${f}`,
    `Quiet hours — ${f}`,
    `${f}, pick up where you left off`,
    `Late session — ${f}`,
    `Still with you — ${f}`,
    `${f}, your work is saved`,
    `Burning midnight — ${f}`,
    `Deep focus — ${f}`,
    `After hours — ${f}`,
    `${f}, no rush`,
  ];

  const pool =
    band === "early"
      ? early
      : band === "morning"
        ? morning
        : band === "afternoon"
          ? afternoon
          : band === "evening"
            ? evening
            : late;
  const idx = (idxBase + dayMix + stableHash(`hero:${band}`)) % pool.length;
  return pool[idx]!;
}

/**
 * One warm subline under the hero: local time + place, then workspace-specific sentence.
 * Feels like a morning briefing, not marketing copy.
 */
export function getOverviewPersonalSubline(
  ctx: WorkspaceInsightContext,
  userId: string | undefined,
  timezone?: string,
  regionKey?: string,
  locale: string = "en-US"
): string {
  const place = getDisplayLocationLabel(timezone, regionKey);
  const clock = formatClockInTimezone(timezone, locale);
  const timePart = place ? `It's ${clock} in ${place}.` : `It's ${clock} where you work.`;

  const tailored = getOverviewSubline(ctx, userId);
  if (tailored) {
    return `${timePart} ${tailored}`;
  }

  const latest = ctx.latestExtraction;
  if (ctx.extractionCount > 0 && latest) {
    const runSeed = stableHash(`${userId ?? "anon"}:${dayKey()}:lastrun`);
    const lastRunLines = [
      `Last run: ${latest.projectName}.`,
      `Most recent capture: ${latest.projectName}.`,
      `Latest run is in ${latest.projectName}.`,
      `Your newest run lives in ${latest.projectName}.`,
      `Picked up where you left off — ${latest.projectName}.`,
    ] as const;
    const tail = lastRunLines[runSeed % lastRunLines.length]!;
    return `${timePart} ${tail}`;
  }
  if (ctx.extractionCount > 0) {
    return `${timePart} ${ctx.extractionCount} run${ctx.extractionCount === 1 ? "" : "s"} in your history — same numbers as Reports.`;
  }
  return `${timePart} Capture operational text on Desk to light up activity here.`;
}

/** Dismissible “Today” cards on Overview — ids are stable per intent; tips get daily variety. */
export type TodayCardDef = {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  /** In-app path, `#new-project`, or `#assistant` */
  ctaHref?: string;
  learnMoreLabel?: string;
  learnMoreHref?: string;
  variant?: "default" | "accent";
};

function dedupeTodayCards(cards: TodayCardDef[]): TodayCardDef[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Cards for the Today panel (generated fresh each day; dismissed ids stored in localStorage).
 */
export function getTodayCardsForWorkspace(
  ctx: WorkspaceInsightContext,
  userId: string | undefined,
  timezone?: string,
  regionKey?: string,
  locale: string = "en-US"
): TodayCardDef[] {
  const seed = stableHash(`${userId ?? "anon"}:${dayKey()}:todaycards`);
  const out: TodayCardDef[] = [];
  const hour = hourInTimezone(timezone);
  /** Full “morning” window in your zone: midnight–noon — includes pre‑5 a.m. daily snapshot. */
  const morningWindow = hour >= 0 && hour < 12;
  const beforeFive = hour < 5;

  if (morningWindow) {
    const city = getDisplayLocationLabel(timezone, regionKey);
    const clock = formatClockInTimezone(timezone, locale);
    const place = city ? `${clock} · ${city}` : clock;
    let body = beforeFive
      ? `Before 5:00 — local time ${place}. Same live counts as Reports and digest. `
      : `Local time ${place}. `;
    if (ctx.extractionCount === 0) {
      body += "Your log is quiet — paste a client or program thread on Desk when you’re ready.";
    } else {
      body += `${ctx.extractionCount} run${ctx.extractionCount === 1 ? "" : "s"} across ${ctx.projectCount} project${ctx.projectCount === 1 ? "" : "s"}.`;
      if (ctx.latestExtraction) {
        body += ` Newest: ${ctx.latestExtraction.projectName}.`;
      }
    }
    out.push({
      id: "today-morning-brief",
      title: beforeFive ? "Early hours — your snapshot" : "Good morning — your snapshot",
      body,
      ctaLabel:
        ctx.latestExtraction && ctx.extractionCount > 0 ? "Jump to latest run" : "Open Desk",
      ctaHref:
        ctx.latestExtraction && ctx.extractionCount > 0
          ? `/projects/${ctx.latestExtraction.projectId}#ex-${ctx.latestExtraction.id}`
          : deskUrl(),
      learnMoreLabel: "Open digest",
      learnMoreHref: "#notifications",
      variant: "accent",
    });
  }

  if (ctx.projectCount === 0) {
    out.push({
      id: "today-need-project",
      title: "Start with a program or account",
      body: "Projects scope every commitment, decision, and action. Name a client or program, then pick a template (try Client program on Desk).",
      ctaLabel: "Open builder",
      ctaHref: "#new-project",
      variant: "accent",
    });
  } else if (ctx.extractionCount === 0) {
    out.push({
      id: "today-need-run",
      title: "Run your first pass",
      body: "Open Desk, choose that project, paste notes or an escalation — that seeds Overview metrics and your audit trail.",
      ctaLabel: "Open Desk",
      ctaHref: deskUrl(),
      variant: "accent",
    });
  }

  if (!ctx.readiness?.openai) {
    out.push({
      id: "today-openai",
      title: "Optional AI",
      body: "Your deployment has not exposed the hosted OpenAI path yet — check AI settings and integrations, or contact your admin.",
      ctaLabel: "AI settings",
      ctaHref: "/settings",
      learnMoreLabel: "Product scope",
      learnMoreHref: "/docs/product",
    });
  }

  const latest = ctx.latestExtraction;
  if (latest && ctx.extractionCount > 0) {
    const snippet = latest.summarySnippet?.trim().slice(0, 72);
    const clip =
      latest.summarySnippet && latest.summarySnippet.length > 72
        ? `${snippet}…`
        : snippet;
    out.push({
      id: "today-dup-latest",
      title: "Duplicate a run",
      body: clip
        ? `Open your latest run in “${latest.projectName}” — use Duplicate on the card to branch without losing the original. (${clip})`
        : `Open your latest run in “${latest.projectName}” — use Duplicate on the card to branch without losing the original.`,
      ctaLabel: "Open latest run",
      ctaHref: `/projects/${latest.projectId}#ex-${latest.id}`,
      learnMoreLabel: "Product scope",
      learnMoreHref: "/docs/product",
      variant: "accent",
    });
  } else if (ctx.projectCount > 0) {
    out.push({
      id: "today-dup-howto",
      title: "Duplicate a run",
      body: "Inside any project, open a past run and tap Duplicate — same inputs and structure, new run you can edit.",
      ctaLabel: "Open projects",
      ctaHref: "/overview",
      learnMoreLabel: "Desk & projects",
      learnMoreHref: "/docs/product",
    });
  }

  const tips: TodayCardDef[] = [
    {
      id: "today-tip-pin",
      title: "Pin active work",
      body: "Pin programs or client accounts in the sidebar so current delivery stays on top.",
      ctaLabel: "Projects",
      ctaHref: "/overview",
      learnMoreLabel: "How projects work",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-palette",
      title: "⌘K everywhere",
      body: "Search projects and routes without leaving the keyboard.",
      ctaLabel: "Try search",
      ctaHref: "/overview",
      learnMoreLabel: "Command palette",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-relay",
      title: "Why Route5",
      body: "Read the short positioning: execution breaks after decisions — Route5 is the layer that keeps ownership visible.",
      ctaLabel: "Product story",
      ctaHref: "/product",
      learnMoreLabel: "Guides",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-desk-templates",
      title: "Desk templates",
      body: "Use Client program, Meeting, or Incident on Desk to pre-fill structure before you paste.",
      ctaLabel: "Open Desk",
      ctaHref: deskUrl(),
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-marketplace",
      title: "Optional connectors",
      body: "Linear, GitHub, and others are API keys under Settings — nothing to “install,” just connect when you need live context.",
      ctaLabel: "Connections",
      ctaHref: "/settings#connections",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-linear",
      title: "Linear import",
      body: "Pull issue bodies into a project run from the Linear integration page.",
      ctaLabel: "Linear",
      ctaHref: "/integrations/linear",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-github",
      title: "GitHub import",
      body: "Import an issue by URL or browse assigned work from the GitHub hub.",
      ctaLabel: "GitHub",
      ctaHref: "/integrations/github",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-figma",
      title: "Figma import",
      body: "With a server token, pull file text and comments into Desk or a project.",
      ctaLabel: "Figma",
      ctaHref: "/integrations/figma",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-settings",
      title: "AI vs offline pass",
      body: "Choose AI vs offline defaults under Settings — affects every new run.",
      ctaLabel: "Settings",
      ctaHref: "/settings",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-customize",
      title: "Workspace prefs",
      body: "Timezone, locale, and pass defaults live in Settings — they drive how Overview and Desk label “today.”",
      ctaLabel: "Settings",
      ctaHref: "/settings",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-library",
      title: "Execution health",
      body: "Overview shows open actions and completion from saved runs — the same numbers everywhere in the app.",
      ctaLabel: "Overview",
      ctaHref: "/overview",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-plans",
      title: "Plans & limits",
      body: "See run quotas and tier features under Account → Plans.",
      ctaLabel: "Plans",
      ctaHref: "/account/plans",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-support",
      title: "Support",
      body: "Priority queue and contact options live on the Support page.",
      ctaLabel: "Support",
      ctaHref: "/support",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-docs",
      title: "Guides",
      body: "Executive brief, what we ship, roadmap, and privacy — all under Guides.",
      ctaLabel: "Guides",
      ctaHref: "/docs",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-roadmap",
      title: "Roadmap honesty",
      body: "See what is shipping vs planned — we label roadmap items explicitly.",
      ctaLabel: "Roadmap",
      ctaHref: "/docs/roadmap",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-google",
      title: "Google Workspace",
      body: "Paste mail or doc context from the Google integration route into Desk.",
      ctaLabel: "Google",
      ctaHref: "/integrations/google",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-slack",
      title: "Slack",
      body: "Paste threads into Desk; the Slack integration page documents Pro+ deployment hooks.",
      ctaLabel: "Slack",
      ctaHref: "/integrations/slack",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-digest-page",
      title: "Overview snapshot",
      body: "Same live counts as the bell — Overview is the one place for commitment health.",
      ctaLabel: "Overview",
      ctaHref: "/overview",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-reports-export",
      title: "Track completion",
      body: "Check off commitments on each run — Overview rolls completion and stale items from what you saved.",
      ctaLabel: "Overview",
      ctaHref: "/overview",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-scratch",
      title: "Per-project scratch",
      body: "Inside a project workspace, scratch notes persist locally for drafts before you run a pass.",
      ctaLabel: "Open a project",
      ctaHref: "/overview",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-actions",
      title: "Action checklists",
      body: "Check off action items on a run — completion feeds workspace metrics.",
      ctaLabel: "Open a project",
      ctaHref: "/overview",
      learnMoreHref: "/docs/product",
    },
    {
      id: "today-tip-onboarding",
      title: "Guided setup",
      body: "Replay onboarding anytime to walk connectors and your first Desk pass.",
      ctaLabel: "Onboarding",
      ctaHref: "/onboarding?replay=1",
      learnMoreHref: "/docs/product",
    },
  ];

  const shuffled = seededShuffle(tips, seed);
  const pick: TodayCardDef[] = [];
  const seenTipIds = new Set<string>();
  /** More variety during morning hours (including before 5 a.m.). */
  const tipQuota = morningWindow ? 3 : 2;
  for (const t of shuffled) {
    if (pick.length >= tipQuota) break;
    if (seenTipIds.has(t.id)) continue;
    seenTipIds.add(t.id);
    pick.push(t);
  }

  for (const t of pick) {
    out.push(t);
  }

  return dedupeTodayCards(out);
}
