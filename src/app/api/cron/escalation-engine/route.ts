import { NextResponse } from "next/server";
import { runEscalationEngineForAllOrgs } from "@/lib/escalations/engine";

export const runtime = "nodejs";

/**
 * Runs org escalation rules (15m cron). Protect with CRON_SECRET in production.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const { orgs, results } = await runEscalationEngineForAllOrgs();
    const summary = results.map((r) => ({
      orgId: r.orgId,
      created: r.created,
      upgraded: r.upgraded,
      stale24: r.stale24,
      stale48: r.stale48,
      total: r.created + r.upgraded + r.stale24 + r.stale48,
    }));
    return NextResponse.json({ ok: true, orgs, results: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
