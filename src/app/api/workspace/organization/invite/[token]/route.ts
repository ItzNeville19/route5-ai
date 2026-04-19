import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getOrganizationInvitationByToken } from "@/lib/workspace/org-members";
import { getOrganizationProfile } from "@/lib/workspace/organizations-update";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const invite = await getOrganizationInvitationByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  let inviterName = "Teammate";
  try {
    const c = await clerkClient();
    const u = await c.users.getUser(invite.invitedBy);
    inviterName =
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username ||
      u.primaryEmailAddress?.emailAddress ||
      inviterName;
  } catch {
    /* ignore */
  }
  const org = await getOrganizationProfile(invite.orgId);
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  return NextResponse.json({
    invite: {
      token,
      orgId: invite.orgId,
      orgName: org.name,
      email: invite.email,
      role: invite.role,
      invitedBy: invite.invitedBy,
      inviterName,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      expired,
    },
  });
}
