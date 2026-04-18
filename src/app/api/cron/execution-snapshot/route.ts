import { NextResponse } from "next/server";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";
import { listAllOrganizationIds, upsertExecutionSnapshotForOrg } from "@/lib/dashboard/store";

export const runtime = "nodejs";

/**
 * Daily snapshot for execution_snapshots (midnight UTC cron).
 * Set CRON_SECRET and Authorization: Bearer in production.
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
