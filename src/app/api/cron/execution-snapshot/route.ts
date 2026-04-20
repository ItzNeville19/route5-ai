import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";
import { listAllOrganizationIds, upsertExecutionSnapshotForOrg } from "@/lib/dashboard/store";

export const runtime = "nodejs";

/**
 * Daily snapshot for execution_snapshots (midnight UTC cron).
 * Set CRON_SECRET and Authorization: Bearer in production.
 */
export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  try {
    const orgIds = await listAllOrganizationIds();
    for (const orgId of orgIds) {
      await upsertExecutionSnapshotForOrg(orgId);
      broadcastOrgDashboardEvent(orgId);
    }
    return NextResponse.json({ ok: true, orgs: orgIds.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
