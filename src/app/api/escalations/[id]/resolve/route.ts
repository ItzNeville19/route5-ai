import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getEscalationByIdForOrg, resolveEscalation } from "@/lib/escalations/store";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    resolution_notes: z.string().min(1).max(8000),
  })
  .strict();

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-escalations:resolve", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const parsed = await parseJsonBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;

    const existing = await getEscalationByIdForOrg(id, orgId);
    if (!existing || existing.resolvedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = await resolveEscalation(id, orgId, userId, parsed.data.resolution_notes.trim());
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    broadcastOrgDashboardEvent(orgId);
    return NextResponse.json({ ok: true, escalation: row });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
