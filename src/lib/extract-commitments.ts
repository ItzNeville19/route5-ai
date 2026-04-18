import { nanoid } from "nanoid";
import type { CommitmentPriority, CommitmentSource } from "@/lib/commitment-types";

/** Draft row produced by extraction before persisting. */
export type ExtractedCommitmentDraft = {
  title: string;
  description?: string | null;
  /** Tentative owner name from text (no Clerk id yet). */
  ownerName?: string | null;
  /** Set in Desk review when assigning to a signed-in teammate (Clerk user id). */
  ownerUserId?: string | null;
  source: CommitmentSource;
  sourceReference?: string;
  priority: CommitmentPriority;
  dueDate?: string | null;
  /** Original line or span used as the commitment (for Capture source quote). */
  sourceSnippet?: string | null;
};

const LINE_PATTERNS = [
  /^(?:[-*•]\s*|TODO:?\s*|ACTION:?\s*)(.+)$/i,
  /^(?:\d+[.)]\s+)(.+)$/,
];

function guessSource(text: string): CommitmentSource {
  const t = text.toLowerCase();
  if (t.includes("slack") || t.includes("#channel")) return "slack";
  if (t.includes("@") && t.includes("thread")) return "slack";
  if (t.includes("meeting") || t.includes("attendees:") || t.includes("agenda")) return "meeting";
  if (t.includes("subject:") || t.includes("from:") && t.includes("to:")) return "email";
  return "meeting";
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseOwnerHint(line: string): { rest: string; owner?: string } {
  const pipe = line.match(/^owner:\s*([^|]+)\|\s*(.+)$/i);
  if (pipe) {
    const owner = pipe[1].trim();
    const rest = pipe[2].trim();
    if (owner && rest) return { rest, owner };
  }
  const at = line.match(/^@(\S+)\s+(.+)$/);
  if (at) return { owner: at[1], rest: at[2].trim() };
  return { rest: line };
}

/**
 * Placeholder extraction — deterministic, no external AI.
 * Turns bullet lines and TODO patterns into commitments; assigns tentative owner names when present.
 */
export function extractCommitments(text: string): ExtractedCommitmentDraft[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const source = guessSource(trimmed);
  const ref = `extract:${nanoid(8)}`;
  const lines = splitLines(trimmed);
  const out: ExtractedCommitmentDraft[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let body = line;
    let ownerName: string | null = null;

    const oh = parseOwnerHint(line);
    body = oh.rest;
    if (oh.owner) ownerName = oh.owner;

    let matched = false;
    for (const re of LINE_PATTERNS) {
      const m = body.match(re);
      if (m?.[1]) {
        body = m[1].trim();
        matched = true;
        break;
      }
    }

    if (!matched && lines.length > 1 && body.length < 3) continue;
    if (body.length < 4) continue;

    const key = body.slice(0, 120).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      title: body.slice(0, 500),
      description: null,
      ownerName,
      source,
      sourceReference: ref,
      priority: body.length > 120 ? "high" : "medium",
      dueDate: null,
      sourceSnippet: line.slice(0, 600),
    });
  }

  if (out.length === 0) {
    const slice = trimmed.slice(0, 500);
    out.push({
      title: slice.length > 8 ? slice : "Captured commitment",
      description: trimmed.length > 500 ? trimmed : null,
      ownerName: null,
      source,
      sourceReference: ref,
      priority: "medium",
      dueDate: null,
      sourceSnippet: trimmed.slice(0, 600),
    });
  }

  return out.slice(0, 40);
}
