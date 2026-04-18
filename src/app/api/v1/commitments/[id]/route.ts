import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonError, jsonSuccess } from "@/lib/public-api/response";
import {
  getOrgCommitmentDetailForOrgId,
  updateOrgCommitmentForPublicApi,
} from "@/lib/org-commitments/repository";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(1).max(2000).optional(),
    description: z.string().max(20_000).optional().nullable(),
    owner_id: z.string().min(1).max(128).optional(),
    deadline: z.string().min(1).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return withPublicApi(req, "read", async (actx) => {
    const { id } = await ctx.params;
    const detail = await getOrgCommitmentDetailForOrgId(actx.orgId, id);
    if (!detail) return jsonError(actx.requestId, 404, "not_found", "Commitment not found");
    return jsonSuccess(detail, actx.requestId);
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return withPublicApi(req, "write", async (actx) => {
    const { id } = await ctx.params;
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonError(actx.requestId, 400, "invalid_json", "Invalid JSON body");
    }
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(actx.requestId, 400, "validation_error", "Invalid body", {
        issues: parsed.error.flatten(),
      });
    }
    const p = parsed.data;
    try {
      const patch: Parameters<typeof updateOrgCommitmentForPublicApi>[3] = {};
      if (p.title !== undefined) patch.title = p.title;
      if (p.description !== undefined) patch.description = p.description;
      if (p.owner_id !== undefined) patch.owner_id = p.owner_id;
      if (p.deadline !== undefined) patch.deadline = new Date(p.deadline).toISOString();
      if (p.priority !== undefined) patch.priority = p.priority as OrgCommitmentPriority;
      if (p.completed !== undefined) patch.completed = p.completed;
      const { row } = await updateOrgCommitmentForPublicApi(actx.orgId, actx.keyId, id, patch);
      return jsonSuccess(row, actx.requestId);
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return jsonError(actx.requestId, 404, "not_found", "Commitment not found");
      }
      throw e;
    }
  });
}
