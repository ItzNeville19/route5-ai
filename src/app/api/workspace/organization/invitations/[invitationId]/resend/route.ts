import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getPendingOrganizationInvitationById, requireOrgRole } from "@/lib/workspace/org-members";
import { getOrganizationProfile } from "@/lib/workspace/organizations-update";
import { notifyTeamInvited } from "@/lib/notifications/team-invite";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

/**
 * Re-send the invitation email (same link/token). Admin only.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const { invitationId } = await context.params;
  if (!invitationId?.trim()) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  }

  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok || access.orgId !== orgId) {
    return NextResponse.json({ error: "Only admins can resend invitations" }, { status: 403 });
  }

  try {
    const inv = await getPendingOrganizationInvitationById(orgId, invitationId);
    if (!inv) {
      return NextResponse.json(
        { error: "Invitation not found, expired, or already accepted" },
        { status: 404 }
      );
    }
    const org = await getOrganizationProfile(orgId);
    let inviterName = "Route5 admin";
    try {
      const c = await clerkClient();
      const u = await c.users.getUser(userId);
      inviterName =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.username ||
        u.primaryEmailAddress?.emailAddress ||
        inviterName;
    } catch {
      /* ignore */
    }
    const base = appBaseUrl();
    const inviteUrl = `${base}/invite/${inv.token}`;
    await notifyTeamInvited({
      orgId,
      inviteeEmail: inv.email,
      inviterName,
      orgName: org.name,
      inviteUrl,
      invitationToken: inv.token,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not resend invitation" },
      { status: 503 }
    );
  }
}
