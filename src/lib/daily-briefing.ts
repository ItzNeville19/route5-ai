/** Daily HUD briefing — deterministic per calendar day + workspace stats (no dismiss UI). */

import { dateKeyInTimezone } from "@/lib/timezone-date";

export type ReadinessBrief = {
  openai: boolean;
  linear: boolean;
  github: boolean;
};

export type YesterdaySnap = {
  /** ISO date YYYY-MM-DD when snapshot was taken */
  date: string;
  projectCount: number;
  extractionCount: number;
};

const SNAP_KEY = "route5:dashboardYesterdaySnapshot.v1";

export function todayKey(timezone?: string): string {
  return dateKeyInTimezone(timezone);
}

export function loadYesterdaySnapshot(): YesterdaySnap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as YesterdaySnap;
    if (
      typeof o.date === "string" &&
      typeof o.projectCount === "number" &&
      typeof o.extractionCount === "number"
    ) {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveSnap(s: YesterdaySnap) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * On each dashboard visit: if the calendar day rolled, returns the **previous** snapshot
 * so we can show deltas; then stores today’s counts.
 */
export function syncBriefingSnapshot(
  current: {
    projectCount: number;
    extractionCount: number;
  },
  timezone?: string
): YesterdaySnap | null {
  if (typeof window === "undefined") return null;
  const t = todayKey(timezone);
  const prev = loadYesterdaySnapshot();
  if (!prev) {
    saveSnap({ date: t, projectCount: current.projectCount, extractionCount: current.extractionCount });
    return null;
  }
  if (prev.date !== t) {
    const prior = prev;
    saveSnap({ date: t, projectCount: current.projectCount, extractionCount: current.extractionCount });
    return prior;
  }
  saveSnap({ date: t, projectCount: current.projectCount, extractionCount: current.extractionCount });
  return null;
}

function dayHash(timezone?: string): number {
  const t = todayKey(timezone);
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function computeDailyBriefing(ctx: {
  displayName: string;
  projectCount: number;
  extractionCount: number;
  liveConnectorCount: number | null;
  readiness: ReadinessBrief | null;
  priorSnapshot: YesterdaySnap | null;
  timezone?: string;
}): { headline: string; subline: string; bullets: string[] } {
  const first = ctx.displayName.trim().split(/\s+/)[0] || "there";
  const h = dayHash(ctx.timezone);
  const conn = ctx.liveConnectorCount ?? 0;
  const r = ctx.readiness;

  const headlines = [
    `${first}, here’s your focus for today.`,
    `Morning, ${first} — a clear read on the workspace below.`,
    `${first}, quick pulse: what matters most right now.`,
    `Good to see you, ${first}. Here’s where to put your attention.`,
  ];
  const headline = headlines[h % headlines.length];

  let subline = "";
  if (ctx.priorSnapshot) {
    const dp = ctx.projectCount - ctx.priorSnapshot.projectCount;
    const de = ctx.extractionCount - ctx.priorSnapshot.extractionCount;
    if (dp !== 0 || de !== 0) {
      subline = `Since last visit: ${dp >= 0 ? "+" : ""}${dp} projects · ${de >= 0 ? "+" : ""}${de} extractions.`;
    }
  }
  if (!subline) {
    subline = `${ctx.projectCount} project${ctx.projectCount === 1 ? "" : "s"} · ${ctx.extractionCount} run${ctx.extractionCount === 1 ? "" : "s"} · ${conn}/3 connections`;
  }

  const pool: string[] = [];

  if (ctx.projectCount === 0) {
    pool.push("Create a project first — it’s the home for runs, history, and exports.");
  } else {
    pool.push("Open the project with the most open questions and run one extraction.");
  }
  if (ctx.extractionCount === 0) {
    pool.push("Paste real notes or a thread into a run — summaries and actions appear after the first extraction.");
  } else {
    pool.push("Skim recent runs for decisions that still need an owner.");
  }
  if (conn < 3) {
    pool.push(`${conn}/3 connections — add what’s missing when you have a minute.`);
  } else {
    pool.push("Connections look healthy — capture on Desk, then push outcomes to your tools.");
  }
  if (r && !r.openai) {
    pool.push("Model-backed extraction isn’t available — check keys under Connections when you need it.");
  }
  if (r && (!r.linear || !r.github)) {
    pool.push("Link Linear or GitHub so issues and PRs stay in one place.");
  }

  const bullets: string[] = [];
  const start = h % Math.max(1, pool.length);
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    bullets.push(pool[(start + i) % pool.length]);
  }

  return { headline, subline, bullets };
}
