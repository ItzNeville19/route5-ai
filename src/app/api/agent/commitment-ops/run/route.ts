import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import {
  DEFAULT_COMMITMENT_OPS_POLICY,
  runCommitmentOpsAgentForOrg,
  type CommitmentOpsPolicy,
} from "@/lib/agents/commitment-ops-agent";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";
const META_KEY = "route5CommitmentOpsPolicy";

function normalizePolicy(raw: unknown): CommitmentOpsPolicy {
  const base = DEFAULT_COMMITMENT_OPS_POLICY;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const data = raw as Partial<CommitmentOpsPolicy>;
  return {
    mode:
      data.mode === "suggest_then_approve" ||
      data.mode === "auto_send_limited" ||
      data.mode === "fully_automatic"
        ? data.mode
        : base.mode,
    sendOwnerNudges:
      typeof data.sendOwnerNudges === "boolean"
        ? data.sendOwnerNudges
        : base.sendOwnerNudges,
    includeOverdue:
      typeof data.includeOverdue === "boolean"
        ? data.includeOverdue
        : base.includeOverdue,
  };
}

export async function POST() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const policy = normalizePolicy(
      (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY]
    );
    const summary = await runCommitmentOpsAgentForOrg(access.orgId, policy);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: publicWorkspaceError(error) },
      { status: 503 }
    );
  }
}
