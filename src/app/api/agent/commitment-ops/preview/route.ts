import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import { previewCommitmentOpsActions } from "@/lib/agents/commitment-ops-agent";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const actions = await previewCommitmentOpsActions(access.orgId);
    return NextResponse.json({ ok: true, actions, count: actions.length });
  } catch (error) {
    return NextResponse.json(
      { error: publicWorkspaceError(error) },
      { status: 503 }
    );
  }
}
