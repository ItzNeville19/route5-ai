import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { getCompletionTrendLast30Days } from "@/lib/workspace/audit-and-trends";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:trend", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const series = await getCompletionTrendLast30Days(userId);
    return NextResponse.json({ series });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
