import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { getExecutionOverviewForUser } from "@/lib/workspace/store";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:execution:get", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const overview = await getExecutionOverviewForUser(userId, projectId);
    return NextResponse.json({ overview });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
