/** Personalized greeting — taglines rotate by calendar day, not only “new user” copy. */

import { hourInTimezone } from "@/lib/timezone-date";

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TAGLINES = [
  "One place for context, decisions, and handoffs.",
  "Structured runs. Clear history. Team-ready.",
  "Paste, extract, ship — together.",
  "Your team’s intelligence desk.",
  "Collaborate from clarity, not noise.",
  "Decisions and actions, captured.",
  "Where work becomes structured output.",
  "Less thread-chase. More signal.",
] as const;

/** Mix of onboarding, power-user, and system-aware one-liners — index changes daily. */
const WHATS_NEXT = [
  "What’s next: pick a template below or open your latest project.",
  "Tip: pin projects in the sidebar — keep active work on top.",
  "Try Desk for quick capture, then file into a project when it’s ready.",
  "Linear and GitHub live under Integrations when your stack is linked.",
  "Run extraction on meeting notes — you’ll get decisions and actions.",
  "⌘K jumps anywhere; Relay knows your counts when you ask.",
  "History in the sidebar lists recent extractions — jump back in one tap.",
  "Marketplace GET installs apps into your library; Open launches the route.",
  "Command palette: search projects and routes without leaving the keyboard.",
  "Multiple projects? Use the App library list in the sidebar for quick jumps.",
  "When AI extraction is on, runs are richer; heuristic mode still works offline.",
  "Export JSON from a project when you need an audit trail for a run.",
  "Duplicate an extraction to iterate without losing the original.",
  "Filter extractions inside a project as the list grows.",
  "Pinned + History + Relay = fast context without hunting the UI.",
  "Templates: Decision, Incident, Meeting — pre-filled composer, you edit and run.",
  "Focus mode and compact density live in the sidebar display card.",
  "Activity panel (header) shows API links and recent runs — optional.",
  "Your counts on this dashboard update with every project and extraction.",
  "Integrations: samples work first; link your org for live Linear/GitHub.",
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
  const seed = stableHash(`${userId ?? "anon"}:${dayKey()}:${hour}`);
  const f = first.trim() || "there";

  let band: "morning" | "afternoon" | "evening" | "late";
  if (hour >= 5 && hour < 12) band = "morning";
  else if (hour >= 12 && hour < 17) band = "afternoon";
  else if (hour >= 17 && hour < 22) band = "evening";
  else band = "late";

  const morning = [
    `Good morning, ${f}`,
    `Morning, ${f}`,
    `Rise and run — ${f}`,
  ];
  const afternoon = [
    `Good afternoon, ${f}`,
    `Afternoon, ${f}`,
    `Hey ${f} — good to see you`,
  ];
  const evening = [
    `Good evening, ${f}`,
    `Evening, ${f}`,
    `Still here, ${f} — workspace is synced`,
  ];
  const late = [
    `Welcome back, ${f}`,
    `Quiet hours — ${f}, your work is saved`,
    `${f}, you're in — pick up where you left off`,
  ];

  const pool =
    band === "morning"
      ? morning
      : band === "afternoon"
        ? afternoon
        : band === "evening"
          ? evening
          : late;
  return pool[seed % pool.length]!;
}
