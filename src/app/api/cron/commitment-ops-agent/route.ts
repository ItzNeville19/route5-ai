import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runCommitmentOpsAgentForAllOrgs } from "@/lib/agents/commitment-ops-agent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const result = await runCommitmentOpsAgentForAllOrgs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
