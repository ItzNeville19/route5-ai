import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getEscalationByIdForOrg, snoozeEscalation } from "@/lib/escalations/store";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    snooze_reason: z.string().min(1).max(4000),
    snoozed_until: z.string().min(1).max(48),
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
    userAndIpRateScopes(req, "org-escalations:snooze", userId, {
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
    const until = new Date(parsed.data.snoozed_until).getTime();
    if (!Number.isFinite(until)) {
      return NextResponse.json({ error: "Invalid snoozed_until" }, { status: 400 });
    }
    const maxUntil = Date.now() + 24 * 3600000;
    if (until > maxUntil) {
      return NextResponse.json({ error: "Snooze cannot exceed 24 hours" }, { status: 400 });
    }
    if (until <= Date.now()) {
      return NextResponse.json({ error: "snoozed_until must be in the future" }, { status: 400 });
    }

    const existing = await getEscalationByIdForOrg(id, orgId);
    if (!existing || existing.resolvedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const iso = new Date(until).toISOString();
    const row = await snoozeEscalation(id, orgId, iso, parsed.data.snooze_reason.trim());
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    broadcastOrgDashboardEvent(orgId);
    return NextResponse.json({ ok: true, escalation: row });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
