import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { getValidZoomAccessToken } from "@/lib/integrations/zoom-token";
import { zoomApiGet } from "@/lib/integrations/zoom-oauth";
import { upsertZoomMeeting } from "@/lib/integrations/meeting-stores";
import { applyTranscriptDecisionToOrg } from "@/lib/integrations/transcript-decisions";

export async function handleZoomTranscriptCompleted(params: {
  orgId: string;
  meetingUuid: string;
  downloadToken?: string | null;
}): Promise<void> {
  const integ = await getZoomIntegrationForOrg(params.orgId);
  if (!integ || integ.status !== "connected") return;
  const token = await getValidZoomAccessToken(integ);
  if (!token) return;

  let transcriptText = "";
  try {
    if (params.downloadToken) {
      const rec = await zoomApiGet<{ recording_files?: Array<{ file_type?: string; download_url?: string }> }>(
        token,
        `/meetings/${encodeURIComponent(params.meetingUuid)}/recordings`
      );
      const tfile = rec.recording_files?.find((f) => f.file_type === "TRANSCRIPT" || f.file_type === "CC");
      if (tfile?.download_url) {
        const u = new URL(tfile.download_url);
        u.searchParams.set("access_token", params.downloadToken);
        const tr = await fetch(u.toString());
        transcriptText = await tr.text();
      }
    }
  } catch {
    transcriptText = "";
  }

  const meetingId = params.meetingUuid;
  await upsertZoomMeeting({
    orgId: params.orgId,
    zoomMeetingId: meetingId,
    transcriptText: transcriptText || "(transcript unavailable)",
    transcriptFetched: true,
    processed: false,
  });

  const result = await applyTranscriptDecisionToOrg({
    orgId: params.orgId,
    text: transcriptText || "Meeting ended — no transcript text retrieved.",
    sourceLabel: "Zoom",
  });

  await upsertZoomMeeting({
    orgId: params.orgId,
    zoomMeetingId: meetingId,
    transcriptFetched: true,
    transcriptText: transcriptText || undefined,
    processed: true,
    needsReview: result.needsReview,
    confidenceScore: result.confidence,
    commitmentId: result.commitmentId,
  });

  if (result.commitmentId) {
    void broadcastOrgCommitmentEvent(params.orgId, {
      kind: "commitment_created",
      id: result.commitmentId,
    });
  }
}
