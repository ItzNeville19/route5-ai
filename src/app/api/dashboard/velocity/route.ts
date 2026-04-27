import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { computeVelocityWeeks } from "@/lib/dashboard/compute";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getActiveMembershipForUser } from "@/lib/workspace/org-members";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:velocity", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const membership = await getActiveMembershipForUser(userId);
    const role = membership?.role ?? "member";
    const requestedScope = url.searchParams.get("scope");
    const canViewOrg = role === "admin" || role === "manager";
    const scope: "org" | "self" =
      requestedScope === "self" ? "self" : canViewOrg ? "org" : "self";
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await fetchMetricRowsForOrg(orgId, scope === "self" ? userId : undefined);
    const weeks = computeVelocityWeeks(rows);
    return NextResponse.json({ orgId, weeks, scope, role, canViewOrg });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
