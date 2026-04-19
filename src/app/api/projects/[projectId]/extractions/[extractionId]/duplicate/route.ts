import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { duplicateExtractionForUser } from "@/lib/workspace/store";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string; extractionId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "extraction:duplicate", userId, {
      userLimit: 20,
      ipLimit: 40,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId, extractionId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId) || !isWorkspaceResourceId(extractionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const row = await duplicateExtractionForUser(userId, projectId, extractionId);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
