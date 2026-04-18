import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPlanLimit, planLimitResponse } from "@/lib/billing/gate";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";

export const runtime = "nodejs";

/**
 * Validates whether another seat can be added (invite flow).
 * When Clerk Organizations is enabled, call this before creating an invitation.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const gate = await checkPlanLimit(orgId, "seats");
    if (!gate.allowed && gate.upgrade) {
      return planLimitResponse(gate.upgrade);
    }
    return NextResponse.json({
      ok: true,
      message:
        "Seat is available. Team invitations are managed in your identity provider (Clerk). When organization invites are enabled for your workspace, complete the invite there.",
    });
  } catch (e) {
    console.error("billing invite check", e);
    return NextResponse.json({ error: "Could not verify seat limit" }, { status: 500 });
  }
}
