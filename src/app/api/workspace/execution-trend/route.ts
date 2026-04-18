import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCompletionTrendLast30Days } from "@/lib/workspace/audit-and-trends";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
