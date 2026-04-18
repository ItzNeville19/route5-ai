import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { getExecutionOverviewForUser } from "@/lib/workspace/store";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:execution:get", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const overview = await getExecutionOverviewForUser(userId);
    return NextResponse.json({ overview });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
