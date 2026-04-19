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
  /** Original due phrase detected in text (e.g. "next Friday"). */
  dueDatePhrase?: string | null;
  /** Confidence score used by Capture review coloring. */
  confidence?: "high" | "medium" | "low";
  /** Numeric extraction confidence from 0 to 1. */
  confidenceScore?: number;
  /** AI/offline implied item marker. */
  isImplied?: boolean;
  impliedReason?: string | null;
};

const LINE_PATTERNS = [/^(?:[-*•]\s*|TODO:?\s*|ACTION:?\s*)(.+)$/i, /^(?:\d+[.)]\s+)(.+)$/];
const OWNER_ACTION_RE =
  /\b([A-Z][a-z]+)\s+(will|needs to|need to|must|has to|committed to|is going to|said (?:he|she) would)\b/i;
const OWNER_SPLIT_RE =
  /(?:^|(?:\band\b)|(?:[—-])|(?:;))\s*([A-Z][a-z]+)\s+(will|needs to|need to|must|has to|committed to|is going to|said (?:he|she) would)\b/gi;
const IMPLIED_RE =
  /\b(needs to be done|should be done|must be done|to be completed|needs completion|action item|follow-up)\b/i;

function guessSource(text: string): CommitmentSource {
  const t = text.toLowerCase();
  if (t.includes("slack") || t.includes("#channel")) return "slack";
  if (t.includes("@") && t.includes("thread")) return "slack";
  if (t.includes("meeting") || t.includes("attendees:") || t.includes("agenda")) return "meeting";
  if ((t.includes("subject:") || t.includes("from:")) && t.includes("to:")) return "email";
  if (t.includes("dear ") || t.includes("best,") || t.includes("regards")) return "email";
  return "meeting";
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function splitSentences(raw: string): string[] {
  const normalized = raw.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  return normalized
    .split(/(?<=[.!?])\s+(?=[A-Z@])|(?<=\.)\s*[-•]\s+|[\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

function weekdayIndex(name: string): number | null {
  const m = name.toLowerCase();
  if (m.startsWith("mon")) return 1;
  if (m.startsWith("tue")) return 2;
  if (m.startsWith("wed")) return 3;
  if (m.startsWith("thu")) return 4;
  if (m.startsWith("fri")) return 5;
  if (m.startsWith("sat")) return 6;
  if (m.startsWith("sun")) return 0;
  return null;
}

function endOfUtcDay(d: Date): string {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 17, 0, 0, 0));
  return out.toISOString();
}

function moveToNextWeekday(now: Date, weekday: number, includeToday: boolean): Date {
  const d = new Date(now);
  const current = d.getUTCDay();
  let delta = (weekday - current + 7) % 7;
  if (!includeToday && delta === 0) delta = 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function parseDueDateFromText(text: string, now = new Date()): { iso: string | null; phrase: string | null } {
  const t = text.trim();
  const explicit = text.match(
    /\b(?:by|before)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b/i
  );
  if (explicit) {
    const clean = explicit[0]
      .replace(/^(?:by|before)\s+/i, "")
      .replace(/(\d{1,2})(st|nd|rd|th)/i, "$1");
    const hasYear = /\d{4}\s*$/.test(clean);
    const parsed = new Date(hasYear ? clean : `${clean} ${now.getUTCFullYear()}`);
    if (Number.isFinite(parsed.getTime())) return { iso: endOfUtcDay(parsed), phrase: explicit[0] };
  }

  if (/\bend of quarter\b/i.test(t)) {
    const currentQuarter = Math.floor(now.getUTCMonth() / 3);
    const quarterEndMonth = currentQuarter * 3 + 2;
    const d = new Date(Date.UTC(now.getUTCFullYear(), quarterEndMonth + 1, 0, 17, 0, 0, 0));
    return { iso: d.toISOString(), phrase: "end of quarter" };
  }

  const nextWeekday = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (nextWeekday?.[1]) {
    const idx = weekdayIndex(nextWeekday[1]);
    if (idx != null) {
      const d = moveToNextWeekday(now, idx, false);
      if ((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) < 7) {
        d.setUTCDate(d.getUTCDate() + 7);
      }
      return { iso: endOfUtcDay(d), phrase: nextWeekday[0] };
    }
  }

  const weekday = text.match(
    /\b(?:by|before|eod)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:morning|afternoon|evening|eod))?\b/i
  );
  if (weekday?.[1]) {
    const idx = weekdayIndex(weekday[1]);
    if (idx != null) {
      const d = moveToNextWeekday(now, idx, false);
      return { iso: endOfUtcDay(d), phrase: weekday[0] };
    }
  }

  const weekdayLoose = text.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:morning|afternoon|evening|eod))?\b/i
  );
  if (weekdayLoose?.[1]) {
    const idx = weekdayIndex(weekdayLoose[1]);
    if (idx != null) {
      const d = moveToNextWeekday(now, idx, false);
      return { iso: endOfUtcDay(d), phrase: weekdayLoose[0] };
    }
  }

  if (/\bend of month\b/i.test(text)) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 17, 0, 0, 0));
    return { iso: d.toISOString(), phrase: "end of month" };
  }

  if (/\bthis week\b/i.test(text)) {
    const d = new Date(now);
    const day = d.getUTCDay();
    const toFriday = (5 - day + 7) % 7;
    d.setUTCDate(d.getUTCDate() + toFriday);
    return { iso: endOfUtcDay(d), phrase: "this week" };
  }

  if (/\btomorrow\b/i.test(t)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return { iso: endOfUtcDay(d), phrase: "tomorrow" };
  }

  if (/\btoday\b/i.test(t)) {
    return { iso: endOfUtcDay(now), phrase: "today" };
  }

  if (/\b(asap|immediately)\b/i.test(t)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return { iso: endOfUtcDay(d), phrase: "ASAP" };
  }

  if (/\bbefore the call\b/i.test(t)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return { iso: endOfUtcDay(d), phrase: "before the call" };
  }

  return { iso: null, phrase: null };
}

function inferPriority(text: string): CommitmentPriority {
  const t = text.toLowerCase();
  if (/\b(critical|asap|urgent|immediately|blocking|blocker)\b/.test(t)) return "high";
  if (/\b(important|must|needs to|has to|key)\b/.test(t)) return "high";
  if (/\b(will|should|going to|plan to)\b/.test(t)) return "medium";
  if (/\b(maybe|could|might|optional)\b/.test(t)) return "low";
  return "medium";
}

function confidenceBucket(score: number): "high" | "medium" | "low" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function titleCaseAction(action: string): string {
  return action
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+[.]+$/, "")
    .replace(/\s+(?:and|then|,)\s*$/i, "");
}

function buildOwnerActionDraft(
  source: CommitmentSource,
  ref: string,
  snippet: string,
  ownerName: string | null,
  actionText: string,
  priorityContext?: string
): ExtractedCommitmentDraft | null {
  const title = titleCaseAction(actionText);
  if (title.length < 8) return null;
  const due = parseDueDateFromText(title);
  const confidenceScore = ownerName ? (due.iso ? 0.93 : 0.78) : due.iso ? 0.65 : 0.46;
  return {
    title: title.slice(0, 500),
    description: null,
    ownerName,
    ownerUserId: null,
    source,
    sourceReference: ref,
    priority: inferPriority(priorityContext ?? title),
    dueDate: due.iso,
    dueDatePhrase: due.phrase,
    sourceSnippet: snippet.slice(0, 600),
    confidenceScore,
    confidence: confidenceBucket(confidenceScore),
    isImplied: !ownerName,
    impliedReason: !ownerName ? "Owner is not explicitly named in this commitment." : null,
  };
}

function stripOwnerPrefix(segment: string): { owner: string | null; action: string } {
  const match = segment.match(
    /^\s*([A-Z][a-z]+)\s+(will|needs to|need to|must|has to|committed to|is going to|said (?:he|she) would)\s+(.+)$/i
  );
  if (!match) return { owner: null, action: segment.trim() };
  const owner = match[1]?.trim() ?? null;
  const action = match[3]?.trim() ?? "";
  return { owner, action };
}

function splitOwnerSegments(sentence: string): string[] {
  const spans: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  OWNER_SPLIT_RE.lastIndex = 0;
  while ((m = OWNER_SPLIT_RE.exec(sentence)) != null) {
    const start = m.index + (m[0].indexOf(m[1]) >= 0 ? m[0].indexOf(m[1]) : 0);
    spans.push({ start, end: sentence.length });
  }
  if (spans.length === 0) return [sentence.trim()];
  for (let i = 0; i < spans.length - 1; i++) spans[i].end = spans[i + 1].start;
  return spans.map((s) => sentence.slice(s.start, s.end).trim()).filter(Boolean);
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
    if (!matched && !ownerName) continue;
    if (body.length < 4) continue;

    const key = body.slice(0, 120).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const item = buildOwnerActionDraft(source, ref, line, ownerName, body, line);
    if (item) out.push(item);
  }

  // Prose extraction path for non-bullet notes and mixed clauses.
  const sentences = splitSentences(trimmed);
  for (const sentence of sentences) {
    const hasOwnerAction = OWNER_ACTION_RE.test(sentence);
    if (!hasOwnerAction && !IMPLIED_RE.test(sentence)) continue;

    const segments = splitOwnerSegments(sentence);
    if (segments.length === 1 && !OWNER_ACTION_RE.test(segments[0]) && IMPLIED_RE.test(sentence)) {
      const implied = buildOwnerActionDraft(source, ref, sentence, null, sentence, sentence);
      if (implied) {
        implied.isImplied = true;
        implied.impliedReason = "Commitment language exists without explicit owner.";
        const key = implied.title.toLowerCase().slice(0, 160);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(implied);
        }
      }
      continue;
    }

    for (const seg of segments) {
      const parsed = stripOwnerPrefix(seg);
      if (!parsed.owner) continue;
      const key = `${parsed.owner}:${parsed.action}`.toLowerCase().slice(0, 200);
      if (seen.has(key)) continue;
      seen.add(key);
      const item = buildOwnerActionDraft(source, ref, sentence, parsed.owner, parsed.action, seg);
      if (item) out.push(item);
    }
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
      confidenceScore: 0.35,
      confidence: "low",
      isImplied: true,
      impliedReason: "Could not confidently detect a clear owner/action pair.",
    });
  }

  return out.slice(0, 40);
}
