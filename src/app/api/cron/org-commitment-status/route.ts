import { NextResponse } from "next/server";
import { recomputeAllOrgCommitmentStatuses } from "@/lib/org-commitments/repository";

export const runtime = "nodejs";

/**
 * Recomputes automatic status for all org commitments (15m cron).
 * Protect with CRON_SECRET in production.
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
    const n = await recomputeAllOrgCommitmentStatuses();
    return NextResponse.json({ ok: true, updated: n });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
