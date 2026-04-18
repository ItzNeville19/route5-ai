import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonListSuccess } from "@/lib/public-api/response";
import { listOrgAuditLog } from "@/lib/public-api/audit-org";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withPublicApi(req, "read", async (ctx) => {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
    const { entries, total } = await listOrgAuditLog({
      orgId: ctx.orgId,
      userId: url.searchParams.get("user_id") ?? undefined,
      entityType: url.searchParams.get("entity_type") ?? undefined,
      dateFrom: url.searchParams.get("date_from") ?? undefined,
      dateTo: url.searchParams.get("date_to") ?? undefined,
      limit,
      offset,
    });
    return jsonListSuccess(entries, ctx.requestId, { total, limit, offset });
  });
}
