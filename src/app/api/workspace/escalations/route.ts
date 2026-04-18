import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "workspace:escalations", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    if (isSupabaseConfigured()) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("escalation_events")
        .select("*")
        .eq("clerk_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json({ escalations: data ?? [] });
    }
    const rows = sqlite.listEscalationEventsForUser(userId, 100);
    return NextResponse.json({ escalations: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
