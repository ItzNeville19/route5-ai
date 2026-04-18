import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonSuccess } from "@/lib/public-api/response";
import { getOrgPublicDetails } from "@/lib/public-api/org-info";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withPublicApi(req, "read", async (ctx) => {
    const org = await getOrgPublicDetails(ctx.orgId);
    return jsonSuccess(org, ctx.requestId);
  });
}
