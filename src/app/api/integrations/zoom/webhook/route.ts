import { NextResponse } from "next/server";
import { verifyZoomWebhookSignature } from "@/lib/integrations/zoom-webhook-verify";
import { getZoomIntegrationByAccountId } from "@/lib/integrations/zoom-teams-integration";
import { handleZoomTranscriptCompleted } from "@/lib/integrations/process-zoom-transcript";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "plain/text" } });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyZoomWebhookSignature(raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: {
    event?: string;
    payload?: {
      account_id?: string;
      object?: { id?: string; uuid?: string };
    };
    download_token?: string;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event === "endpoint.url_validation") {
    const token = (body as { payload?: { plainToken?: string } }).payload?.plainToken;
    if (token) {
      const hash = await import("crypto").then((c) =>
        c.createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? "").update(token).digest("hex")
      );
      return NextResponse.json({
        plainToken: token,
        encryptedToken: hash,
      });
    }
  }

  if (body.event === "recording.transcript_completed") {
    const accountId = body.payload?.account_id;
    const meetingId = body.payload?.object?.uuid ?? body.payload?.object?.id;
    const downloadToken =
      (body as { download_token?: string }).download_token ??
      (body.payload as { download_token?: string } | undefined)?.download_token ??
      null;
    if (accountId && meetingId) {
      const integ = await getZoomIntegrationByAccountId(accountId);
      if (integ) {
        await handleZoomTranscriptCompleted({
          orgId: integ.orgId,
          meetingUuid: String(meetingId),
          downloadToken,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
