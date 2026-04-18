import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getGmailCapturedById, updateGmailCapturedEmail } from "@/lib/integrations/org-integrations-store";
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
    userAndIpRateScopes(req, "gmail:review:reject", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getGmailCapturedById(id, orgId);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await updateGmailCapturedEmail(id, {
      processed: true,
      decisionDetected: false,
      commitmentId: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
