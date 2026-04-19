import { z } from "zod";
import type { CommitmentSource } from "@/lib/commitment-types";
import { extractCommitments } from "@/lib/extract-commitments";
import {
  createOpenAIClient,
  formatOpenAIError,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { resolveExtractionRoute } from "@/lib/ai-provider-presets";

const CAPTURE_SYSTEM = `You extract concrete, accountable commitments from messy operational text (meeting notes, Slack threads, email forwards). Return ONLY valid JSON with this exact shape:
{"commitments":[{"title":string,"ownerName":string|null,"dueDate":string|null,"priority":"critical"|"high"|"normal"|"low","sourceQuote":string,"sourceType":"meeting"|"slack"|"email"|"manual"}]}

Rules:
- title: one clear sentence — what will be done (not "discuss X").
- ownerName: person named as responsible, or null if unclear.
- dueDate: ISO 8601 datetime (prefer end of named day in the note) or null if none.
- priority: normal unless clearly urgent or low stakes.
- sourceQuote: short verbatim phrase from the input supporting this item (<= 240 chars).
- sourceType: best guess from tone and cues.
- Drop duplicates and vague items. Max 20 commitments. If none, {"commitments":[]}.`;

const aiCommitmentSchema = z.object({
  title: z.string(),
  ownerName: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  sourceQuote: z.string().optional(),
  sourceType: z.enum(["meeting", "slack", "email", "manual"]).optional(),
});

const aiEnvelopeSchema = z.object({
  commitments: z.array(aiCommitmentSchema),
});

export type CaptureProcessedCommitment = {
  title: string;
  ownerName: string | null;
  dueDateIso: string | null;
  priority: OrgCommitmentPriority;
  source: CommitmentSource;
  sourceSnippet: string;
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

function parseAiJson(content: string): CaptureProcessedCommitment[] {
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
      const snippet = (c.sourceQuote ?? title).trim().slice(0, 500);
      return {
        title: title.slice(0, 2000),
        ownerName: c.ownerName?.trim() || null,
        dueDateIso: normalizeAiDate(c.dueDate ?? null),
        priority: mapAiPriority(c.priority),
        source,
        sourceSnippet: snippet,
      } satisfies CaptureProcessedCommitment;
    })
    .filter((x): x is CaptureProcessedCommitment => x != null);
}

export async function processCaptureText(
  text: string,
  extractionProviderId?: string
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

  if (route === "openai") {
    try {
      const client = createOpenAIClient();
      const model = getOpenAIModel();
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: CAPTURE_SYSTEM },
          { role: "user", content: trimmed.slice(0, 80_000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4096,
      });
      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const commitments = parseAiJson(raw);
        if (commitments.length > 0) {
          return { commitments, mode: "ai" };
        }
      }
    } catch (e) {
      return {
        commitments: offlineFromExtract(trimmed),
        mode: "offline",
        error: formatOpenAIError(e),
      };
    }
  }

  return { commitments: offlineFromExtract(trimmed), mode: "offline" };
}

function offlineFromExtract(trimmed: string): CaptureProcessedCommitment[] {
  const drafts = extractCommitments(trimmed);
  return drafts.map((d) => ({
    title: d.title,
    ownerName: d.ownerName ?? null,
    dueDateIso: d.dueDate ?? null,
    priority: mapProjectPriorityToOrg(d.priority),
    source: d.source,
    sourceSnippet: (d.sourceSnippet ?? d.title).trim().slice(0, 500),
  }));
}
