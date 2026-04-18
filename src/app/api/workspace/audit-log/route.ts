import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listAuditTrailForUser } from "@/lib/workspace/audit-and-trends";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:audit", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const fromIso = url.searchParams.get("from") ?? undefined;
  const toIso = url.searchParams.get("to") ?? undefined;
  const ownerSubstr = url.searchParams.get("owner") ?? undefined;
  const includeArchived = url.searchParams.get("includeArchived") === "1";

  try {
    const entries = await listAuditTrailForUser(userId, {
      fromIso,
      toIso,
      ownerSubstr,
      includeArchived,
    });
    return NextResponse.json({ entries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
