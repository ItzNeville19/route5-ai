import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getActiveMembershipForUser } from "@/lib/workspace/org-members";
import { fetchRecentCommitmentActivity } from "@/lib/dashboard/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard:activity", userId, {
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
    const rawLimit = url.searchParams.get("limit");
    const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : 12;
    const limit = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 12;
    const rows = await fetchRecentCommitmentActivity(orgId, limit, scope === "self" ? userId : undefined);
    const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);
    const activity = rows.map((row) => ({
      ...row,
      owner_name: names.get(row.owner_id) ?? row.owner_id.slice(-8),
    }));
    return NextResponse.json({ orgId, scope, role, canViewOrg, activity });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
