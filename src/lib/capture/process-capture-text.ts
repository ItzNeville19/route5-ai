import { z } from "zod";
import type { CommitmentSource } from "@/lib/commitment-types";
import { extractCommitments } from "@/lib/extract-commitments";
import { clerkClient } from "@clerk/nextjs/server";
import {
  createOpenAIClient,
  formatOpenAIError,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { resolveExtractionRoute } from "@/lib/ai-provider-presets";
import { listDistinctOwnerIdsForOrg } from "@/lib/org-commitments/repository";

const CAPTURE_SYSTEM = `You extract concrete, accountable commitments from any operational text: notes, lists, brain dumps, reminders, email, Slack, meeting transcripts, or ad-hoc tasks. Do not assume the input was a meeting unless the text clearly says so.
Today is: {{TODAY_ISO}}.
Known org members (for owner matching): {{ORG_MEMBERS}}.
Return ONLY valid JSON with this exact shape:
{"commitments":[{"title":string,"ownerName":string|null,"ownerUserId":string|null,"deadlineISO":string|null,"deadlineOriginalPhrase":string|null,"priority":"critical"|"high"|"normal"|"low","confidence":number,"sourceSnippet":string,"sourceType":"meeting"|"slack"|"email"|"manual","isImplied":boolean,"impliedReason":string|null}]}

Rules:
- title: one clear sentence — what will be done (not "discuss X"), max 180 chars. Reminders-style: actionable, specific.
- Keep work grouped by assignee: if one owner has multiple instructions in the same context, prefer one commitment title with a concise checklist-style phrase instead of many near-duplicate items.
- ownerName: person named as responsible, or null if unclear.
- ownerUserId: if ownerName matches a known org member, include exact user id; else null.
- deadlineISO: resolve relative dates to real ISO datetime (next Friday, end of month, by Wednesday, EOD Tuesday, this week, ASAP, tomorrow) using TODAY date. If no date is mentioned, use null (the app will apply a default).
- deadlineOriginalPhrase: original phrase from text (e.g. "next Friday").
- priority inference:
  critical/ASAP/urgent/immediately/blocker => critical
  important/must/has to/needs to => high
  maybe/could/might => low
  else normal
- confidence: numeric value from 0 to 1 (inclusive) reflecting extraction certainty.
- sourceSnippet: short verbatim phrase from the input supporting this item (<= 240 chars).
- sourceType: use "manual" when the source is generic notes or unclear; only use meeting/slack/email when cues match.
- isImplied true only if the commitment is strongly implied but not explicit; include impliedReason.
- Drop duplicates and vague items. Max 60 commitments. If none, {"commitments":[]}.`;

const aiCommitmentSchema = z.object({
  title: z.string(),
  ownerName: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  deadlineISO: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  deadlineOriginalPhrase: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  confidence: z.union([z.number().min(0).max(1), z.enum(["high", "medium", "low"])]).optional(),
  sourceSnippet: z.string().optional(),
  sourceQuote: z.string().optional(),
  sourceType: z.enum(["meeting", "slack", "email", "manual"]).optional(),
  isImplied: z.boolean().optional(),
  impliedReason: z.string().nullable().optional(),
});

const aiEnvelopeSchema = z.object({
  commitments: z.array(aiCommitmentSchema),
});

export type CaptureProcessedCommitment = {
  title: string;
  ownerName: string | null;
  ownerUserId: string | null;
  dueDateIso: string | null;
  deadlineOriginalPhrase: string | null;
  priority: OrgCommitmentPriority;
  source: CommitmentSource;
  sourceSnippet: string;
  confidence: "high" | "medium" | "low";
  isImplied: boolean;
  impliedReason: string | null;
};

function mapAiPriority(p: string | undefined): OrgCommitmentPriority {
  switch (p) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    case "normal":
    default:
      return "medium";
  }
}

function mapAiConfidence(
  raw: number | "high" | "medium" | "low" | undefined
): "high" | "medium" | "low" {
  if (raw == null) return "medium";
  if (typeof raw === "number") {
    if (raw >= 0.8) return "high";
    if (raw >= 0.5) return "medium";
    return "low";
  }
  return raw;
}

function mapProjectPriorityToOrg(p: "low" | "medium" | "high"): OrgCommitmentPriority {
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

function normalizeAiDate(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function normalizeNameKey(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadOwnerDirectory(userId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = new Set<string>([userId]);
  try {
    for (const id of await listDistinctOwnerIdsForOrg(userId)) ids.add(id);
  } catch {
    /* best effort */
  }
  const c = await clerkClient();
  for (const id of [...ids].slice(0, 100)) {
    try {
      const u = await c.users.getUser(id);
      const labels = [
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
        u.firstName ?? "",
        u.lastName ?? "",
        u.username ? `@${u.username}` : "",
        u.username ?? "",
        u.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "",
      ]
        .map((x) => x.trim())
        .filter(Boolean);
      for (const label of labels) {
        map.set(normalizeNameKey(label.replace(/^@/, "")), id);
      }
    } catch {
      /* ignore user lookup failures */
    }
  }
  return map;
}

function parseAiJson(content: string, ownerDirectory: Map<string, string>): CaptureProcessedCommitment[] {
  const parsed = JSON.parse(content) as unknown;
  const env = aiEnvelopeSchema.safeParse(parsed);
  if (!env.success) return [];
  const sources: CommitmentSource[] = ["meeting", "slack", "email", "manual"];
  return env.data.commitments
    .map((c) => {
      const title = c.title?.trim() ?? "";
      if (title.length < 3) return null;
      const rawSource = c.sourceType ?? "manual";
      const source = sources.includes(rawSource) ? rawSource : "manual";
      const snippet = (c.sourceSnippet ?? c.sourceQuote ?? title).trim().slice(0, 500);
      const ownerName = c.ownerName?.trim() || null;
      const ownerUserId =
        (c.ownerUserId && c.ownerUserId.trim()) ||
        (ownerName ? ownerDirectory.get(normalizeNameKey(ownerName)) ?? null : null);
      return {
        title: title.slice(0, 2000),
        ownerName,
        ownerUserId: ownerUserId ?? null,
        dueDateIso: normalizeAiDate(c.deadlineISO ?? c.dueDate ?? null),
        deadlineOriginalPhrase: c.deadlineOriginalPhrase?.trim() || null,
        priority: mapAiPriority(c.priority),
        source,
        sourceSnippet: snippet,
        confidence: mapAiConfidence(c.confidence),
        isImplied: Boolean(c.isImplied),
        impliedReason: c.impliedReason?.trim() || null,
      } satisfies CaptureProcessedCommitment;
    })
    .filter((x): x is CaptureProcessedCommitment => x != null);
}

export async function processCaptureText(
  text: string,
  extractionProviderId?: string,
  opts?: { userId?: string }
): Promise<{
  commitments: CaptureProcessedCommitment[];
  mode: "ai" | "offline";
  error?: string;
}> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { commitments: [], mode: "offline" };
  }

  const openaiConfigured = isOpenAIConfigured();
  const route = resolveExtractionRoute(extractionProviderId, openaiConfigured);
  const ownerDirectory =
    opts?.userId != null ? await loadOwnerDirectory(opts.userId).catch(() => new Map<string, string>()) : new Map<string, string>();

  if (route === "openai") {
    try {
      const client = createOpenAIClient();
      const model = getOpenAIModel();
      const today = new Date().toISOString();
      const members = [...ownerDirectory.entries()]
        .slice(0, 120)
        .map(([name, id]) => `${name}:${id}`)
        .join(", ");
      const system = CAPTURE_SYSTEM.replace("{{TODAY_ISO}}", today).replace("{{ORG_MEMBERS}}", members || "none");
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: trimmed.slice(0, 80_000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4096,
      });
      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const commitments = parseAiJson(raw, ownerDirectory);
        if (commitments.length > 0) {
          return { commitments, mode: "ai" };
        }
      }
    } catch (e) {
      return {
        commitments: offlineFromExtract(trimmed, ownerDirectory),
        mode: "offline",
        error: formatOpenAIError(e),
      };
    }
  }

  return { commitments: offlineFromExtract(trimmed, ownerDirectory), mode: "offline" };
}

function offlineFromExtract(trimmed: string, ownerDirectory: Map<string, string>): CaptureProcessedCommitment[] {
  const drafts = extractCommitments(trimmed);
  return drafts.map((d) => ({
    title: d.title,
    ownerName: d.ownerName ?? null,
    ownerUserId: d.ownerName ? ownerDirectory.get(normalizeNameKey(d.ownerName)) ?? null : null,
    dueDateIso: d.dueDate ?? null,
    deadlineOriginalPhrase: d.dueDatePhrase ?? null,
    priority: mapProjectPriorityToOrg(d.priority),
    source: d.source,
    sourceSnippet: (d.sourceSnippet ?? d.title).trim().slice(0, 500),
    confidence: d.confidence ?? "medium",
    isImplied: Boolean(d.isImplied),
    impliedReason: d.impliedReason ?? null,
  }));
}
