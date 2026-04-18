import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonError, jsonListSuccess, jsonSuccess } from "@/lib/public-api/response";
import {
  createOrgCommitmentForPublicApi,
  listOrgCommitmentsForOrgId,
} from "@/lib/org-commitments/repository";
import type { OrgCommitmentListSort } from "@/lib/org-commitment-types";
import { checkPlanLimit } from "@/lib/billing/gate";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    owner_id: z.string().min(1).max(128),
    deadline: z.string().min(1),
    priority: z.enum(["critical", "high", "medium", "low"]),
  })
  .strict();

export async function GET(req: NextRequest) {
  return withPublicApi(req, "read", async (ctx) => {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
    const sort = (url.searchParams.get("sort") ?? "deadline") as OrgCommitmentListSort;
    const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";
    const { rows, total } = await listOrgCommitmentsForOrgId(ctx.orgId, {
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      owner: url.searchParams.get("owner") ?? undefined,
      dateFrom: url.searchParams.get("date_from") ?? undefined,
      dateTo: url.searchParams.get("date_to") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      sort,
      order,
      limit,
      offset,
    });
    return jsonListSuccess(rows, ctx.requestId, { total, limit, offset });
  });
}

export async function POST(req: NextRequest) {
  return withPublicApi(req, "write", async (ctx) => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonError(ctx.requestId, 400, "invalid_json", "Invalid JSON body");
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(ctx.requestId, 400, "validation_error", "Invalid body", {
        issues: parsed.error.flatten(),
      });
    }
    const gate = await checkPlanLimit(ctx.orgId, "commitments");
    if (!gate.allowed && gate.upgrade) {
      return jsonError(ctx.requestId, 409, "plan_limit", gate.upgrade.message, {
        upgrade: gate.upgrade,
      });
    }
    const row = await createOrgCommitmentForPublicApi(ctx.orgId, ctx.keyId, {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      ownerId: parsed.data.owner_id,
      deadline: new Date(parsed.data.deadline).toISOString(),
      priority: parsed.data.priority,
    });
    return jsonSuccess(row, ctx.requestId);
  });
}
