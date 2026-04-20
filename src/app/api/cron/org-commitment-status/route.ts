import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { recomputeAllOrgCommitmentStatuses } from "@/lib/org-commitments/repository";

export const runtime = "nodejs";

/**
 * Recomputes automatic status for all org commitments (15m cron).
 * Protect with CRON_SECRET in production.
 */
export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const n = await recomputeAllOrgCommitmentStatuses();
    return NextResponse.json({ ok: true, updated: n });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
