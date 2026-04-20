import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { pollAllConnectedNotionOrgs } from "@/lib/integrations/notion-poll";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const r = await pollAllConnectedNotionOrgs();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
