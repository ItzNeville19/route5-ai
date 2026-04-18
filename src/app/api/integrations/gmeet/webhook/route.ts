import { NextResponse } from "next/server";
import { applyTranscriptDecisionToOrg } from "@/lib/integrations/transcript-decisions";
import { upsertGmeetMeeting } from "@/lib/integrations/meeting-stores";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { listConnectedGmailIntegrations } from "@/lib/integrations/org-integrations-store";

export const runtime = "nodejs";

/**
 * Google Workspace Events / Meet — push payloads vary by configuration.
 * Verifies Bearer JWT when GOOGLE_WORKSPACE_EVENTS_AUDIENCE is set; otherwise accepts signed payloads in development only.
 */
export async function POST(req: Request) {
  const aud = process.env.GOOGLE_WORKSPACE_EVENTS_AUDIENCE?.trim();
  const auth = req.headers.get("authorization");
  if (aud && auth !== `Bearer ${aud}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { meeting?: { id?: string }; text?: string; eventType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const integrations = await listConnectedGmailIntegrations();
  if (integrations.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const orgId = integrations[0]!.orgId;
  const eventId = body.meeting?.id ?? `gmeet-${Date.now()}`;
  const text = body.text ?? "Meeting ended — transcript not attached to webhook payload.";
  const result = await applyTranscriptDecisionToOrg({
    orgId,
    text,
    sourceLabel: "Google Meet",
  });
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

  return NextResponse.json({ ok: true });
}
