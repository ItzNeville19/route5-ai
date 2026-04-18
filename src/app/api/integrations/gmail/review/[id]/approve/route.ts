import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { approveGmailReviewEmail } from "@/lib/integrations/gmail-process-email";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "gmail:review:approve", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const result = await approveGmailReviewEmail(orgId, id);
    if (!result) {
      return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, commitmentId: result.commitmentId });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
