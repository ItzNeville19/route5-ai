import { NextResponse } from "next/server";
import { handleGmeetPubSubPush } from "@/lib/integrations/gmeet-handle-push";

export const runtime = "nodejs";

/** Pub/Sub push for Google Workspace Events (Meet) — configure a push subscription on the Meet events topic. */
export async function POST(req: Request) {
  try {
    const r = await handleGmeetPubSubPush(req);
    return NextResponse.json({ ok: r.ok, detail: r.detail }, { status: r.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
