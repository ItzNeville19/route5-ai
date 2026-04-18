import { applyTranscriptDecisionToOrg } from "@/lib/integrations/transcript-decisions";
import { upsertGmeetMeeting } from "@/lib/integrations/meeting-stores";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import { listConnectedGmailIntegrations } from "@/lib/integrations/org-integrations-store";
import { listTranscriptEntries } from "@/lib/integrations/gmeet-meet-api";

type PubSubPushBody = {
  message?: { data?: string; attributes?: Record<string, string> };
};

function verifyPubSubToken(req: Request): boolean {
  const expected = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN?.trim();
  if (!expected) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  const q = new URL(req.url).searchParams.get("token");
  return q === expected;
}

function subjectUserId(ceSubject: string): string | null {
  const m = ceSubject.match(/\/users\/([^/]+)\s*$/);
  return m?.[1]?.trim() ?? null;
}

export async function handleGmeetPubSubPush(req: Request): Promise<{ ok: boolean; status: number; detail?: string }> {
  if (!verifyPubSubToken(req)) {
    return { ok: false, status: 401, detail: "unauthorized" };
  }

  let body: PubSubPushBody;
  try {
    body = (await req.json()) as PubSubPushBody;
  } catch {
    return { ok: false, status: 400, detail: "invalid json" };
  }

  const dataB64 = body.message?.data;
  const attrs = body.message?.attributes ?? {};
  const ceType = attrs["ce-type"] ?? attrs["ce_type"];
  if (!dataB64 || !ceType) {
    return { ok: true, status: 200, detail: "noop" };
  }

  if (ceType === "google.workspace.events.subscription.v1.expirationReminder") {
    return { ok: true, status: 200, detail: "lifecycle" };
  }

  if (ceType !== "google.workspace.meet.transcript.v2.fileGenerated") {
    return { ok: true, status: 200, detail: "ignored_type" };
  }

  const ceSubject = attrs["ce-subject"] ?? attrs["ce_subject"] ?? "";
  const userId = subjectUserId(ceSubject);
  if (!userId) {
    return { ok: true, status: 200, detail: "no_subject" };
  }

  let inner: { transcript?: { name?: string } };
  try {
    inner = JSON.parse(Buffer.from(dataB64, "base64").toString("utf8")) as typeof inner;
  } catch {
    return { ok: false, status: 400, detail: "bad event data" };
  }

  const transcriptName = inner.transcript?.name?.trim();
  if (!transcriptName) {
    return { ok: true, status: 200, detail: "no_transcript_name" };
  }

  const integrations = await listConnectedGmailIntegrations();
  const match = integrations.find((i) => i.metadata?.google_oauth_sub === userId);
  if (!match) {
    return { ok: true, status: 200, detail: "no_org" };
  }

  const orgId = match.orgId;
  const token = await getValidGmailAccessToken(match);
  if (!token) {
    return { ok: false, status: 503, detail: "no_token" };
  }

  const parts = await listTranscriptEntries(token, transcriptName);
  const text = parts.join("\n\n").trim() || "Meeting transcript (empty).";

  const result = await applyTranscriptDecisionToOrg({
    orgId,
    text,
    sourceLabel: "Google Meet",
  });

  const eventId = transcriptName.split("/").pop() ?? transcriptName;

  await upsertGmeetMeeting({
    orgId,
    googleEventId: eventId,
    summary: "Google Meet",
    transcriptText: text,
    transcriptFetched: true,
    processed: true,
    needsReview: result.needsReview,
    confidenceScore: result.confidence,
    commitmentId: result.commitmentId,
  });

  if (result.commitmentId) {
    void broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: result.commitmentId });
  }

  return { ok: true, status: 200, detail: "processed" };
}
