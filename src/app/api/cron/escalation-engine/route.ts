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
    const startedAt = Date.now();
    const { orgs, results } = await runEscalationEngineForAllOrgs();
    const summary = results.map((r) => ({
      orgId: r.orgId,
      created: r.created,
      upgraded: r.upgraded,
      stale24: r.stale24,
      stale48: r.stale48,
      total: r.created + r.upgraded + r.stale24 + r.stale48,
    }));
    const totals = summary.reduce(
      (acc, row) => {
        acc.created += row.created;
        acc.upgraded += row.upgraded;
        acc.stale24 += row.stale24;
        acc.stale48 += row.stale48;
        acc.total += row.total;
        return acc;
      },
      { created: 0, upgraded: 0, stale24: 0, stale48: 0, total: 0 }
    );
    return NextResponse.json({
      ok: true,
      orgs,
      results: summary,
      totals,
      generatedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
