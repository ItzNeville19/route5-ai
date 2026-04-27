import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { getOrgCommitmentDetail, updateOrgCommitment } from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { parseJsonBody } from "@/lib/security/request-guards";
import { z } from "zod";
import { getActiveMembershipForUser } from "@/lib/workspace/org-members";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    status: z.enum(["pending", "in_progress", "done"]),
  })
  .strict();

const statusMap = {
  pending: "not_started",
  in_progress: "in_progress",
  done: "completed",
} as const;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const params = await ctx.params;
    const commitmentId = params.id;
    const membership = await getActiveMembershipForUser(userId);
    const role = membership?.role ?? "member";
    if (role === "member") {
      const existing = await getOrgCommitmentDetail(userId, commitmentId);
      if (!existing || existing.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const next = await updateOrgCommitment(userId, commitmentId, {
      status: statusMap[parsed.data.status],
      completed: parsed.data.status === "done",
    });
    broadcastOrgCommitmentEvent(next.row.orgId, {
      type: "dashboard_status_update",
      commitmentId: next.row.id,
      status: next.row.status,
      t: Date.now(),
    });
    return NextResponse.json({
      ok: true,
      commitment: {
        id: next.row.id,
        status: next.row.status,
        updated_at: next.row.updatedAt,
      },
    });
  } catch (error) {
    const message = publicWorkspaceError(error);
    const status = message === "NOT_FOUND" ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
