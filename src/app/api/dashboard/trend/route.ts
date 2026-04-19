import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { fetchExecutionSnapshots } from "@/lib/dashboard/store";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:trend", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "30d";
  const now = new Date();
  let since: Date;
  if (range === "90d") {
    since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 90);
  } else if (range === "12m") {
    since = new Date(now);
    since.setUTCFullYear(since.getUTCFullYear() - 1);
  } else {
    since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 30);
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const snapshots = await fetchExecutionSnapshots(orgId, since.toISOString());
    return NextResponse.json({ orgId, range, snapshots });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
