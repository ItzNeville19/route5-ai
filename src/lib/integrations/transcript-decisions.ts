import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { detectDecisionInText } from "@/lib/integrations/slack-decision-ai";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";

function defaultDeadline(): string {
  return new Date(Date.now() + 7 * 24 * 3600000).toISOString();
}

function parseDeadline(iso: string | null | undefined): string {
  if (iso) {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && t > Date.now()) return new Date(t).toISOString();
  }
  return defaultDeadline();
}

function clampPriority(p: string | null | undefined): OrgCommitmentPriority {
  if (p === "critical" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

/** Chunk long transcripts for model context limits. */
export async function detectBestDecisionFromTranscript(text: string): Promise<{
  decision: Awaited<ReturnType<typeof detectDecisionInText>>;
  confidence: number;
}> {
  const clean = text.trim();
  if (!clean) return { decision: { is_decision: false, confidence_score: 0 }, confidence: 0 };
  const chunkSize = 12000;
  if (clean.length <= chunkSize) {
    const decision = await detectDecisionInText(clean);
    return { decision, confidence: decision.confidence_score ?? 0 };
  }
  let best = await detectDecisionInText(clean.slice(0, chunkSize));
  let bestScore = best.confidence_score ?? 0;
  for (let i = chunkSize; i < clean.length; i += chunkSize) {
    const slice = clean.slice(i, i + chunkSize);
    const d = await detectDecisionInText(slice);
    const sc = d.confidence_score ?? 0;
    if (sc > bestScore) {
      best = d;
      bestScore = sc;
    }
  }
  return { decision: best, confidence: bestScore };
}

export async function applyTranscriptDecisionToOrg(params: {
  orgId: string;
  text: string;
  sourceLabel: string;
}): Promise<{ commitmentId: string | null; needsReview: boolean; confidence: number }> {
  const { decision, confidence } = await detectBestDecisionFromTranscript(params.text);
  const conf = decision.confidence_score ?? confidence;

  if (!decision.is_decision || conf < 0.5) {
    return { commitmentId: null, needsReview: false, confidence: conf };
  }

  const title = (decision.decision_text || params.sourceLabel).slice(0, 500);
  const deadline = parseDeadline(decision.inferred_deadline);
  const priority = clampPriority(decision.inferred_priority);
  const ownerId = await getOrganizationClerkUserId(params.orgId);
  if (!ownerId) {
    return { commitmentId: null, needsReview: true, confidence: conf };
  }

  if (conf > 0.75) {
    const row = await createOrgCommitmentAsOrgOwner(params.orgId, {
      title,
      description: `From ${params.sourceLabel} (confidence ${conf.toFixed(2)})`,
      ownerId,
      deadline,
      priority,
    });
    return { commitmentId: row.id, needsReview: false, confidence: conf };
  }

  return { commitmentId: null, needsReview: true, confidence: conf };
}
