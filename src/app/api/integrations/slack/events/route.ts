import { NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/integrations/slack-verify";
import { processSlackMessageEvent } from "@/lib/integrations/slack-process-message";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = verifySlackRequest(
    rawBody,
    req.headers.get("x-slack-request-timestamp"),
    req.headers.get("x-slack-signature")
  );
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: {
    type?: string;
    challenge?: string;
    team_id?: string;
    event?: {
      type?: string;
      subtype?: string;
      channel?: string;
      user?: string;
      text?: string;
      ts?: string;
      bot_id?: string;
      team?: string;
    };
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.type === "url_verification" && body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type === "event_callback" && body.event) {
    const ev = body.event;
    const teamId = body.team_id || ev.team || "";
    if (ev.type === "message" && !ev.subtype && ev.channel && ev.ts && ev.user) {
      void processSlackMessageEvent({
        teamId,
        channel: ev.channel,
        user: ev.user,
        text: ev.text ?? "",
        ts: ev.ts,
        botId: ev.bot_id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
