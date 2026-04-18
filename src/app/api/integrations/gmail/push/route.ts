import { NextResponse } from "next/server";
import { handleGmailPubSubPush } from "@/lib/integrations/gmail-handle-push";

export const runtime = "nodejs";

/** Google Pub/Sub push subscription — must respond quickly. */
export async function POST(req: Request) {
  try {
    const r = await handleGmailPubSubPush(req);
    return NextResponse.json({ ok: r.ok, detail: r.detail }, { status: r.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
