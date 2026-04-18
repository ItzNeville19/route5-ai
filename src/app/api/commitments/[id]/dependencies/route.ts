import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { addOrgCommitmentDependency } from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    dependsOnCommitmentId: z.string().uuid(),
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
    userAndIpRateScopes(req, "org-commitments:deps", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!isWorkspaceResourceId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    await addOrgCommitmentDependency(userId, id, parsed.data.dependsOnCommitmentId);
    broadcastOrgCommitmentEvent(orgId, { kind: "dependency_added", commitmentId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_DEP") {
      return NextResponse.json({ error: "Invalid dependency" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "DUPLICATE_DEP") {
      return NextResponse.json({ error: "Already linked" }, { status: 409 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
