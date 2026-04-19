import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth/require-user";
import { acceptOrganizationInvitationByToken } from "@/lib/workspace/org-members";
import { broadcastOrgMembersChanged } from "@/lib/workspace/org-members-broadcast";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "Invite token is required" }, { status: 400 });

  let email: string | null = null;
  try {
    const c = await clerkClient();
    const user = await c.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    email = null;
  }
  if (!email) {
    return NextResponse.json(
      { error: "Could not verify your account email. Confirm your primary email, then try again." },
      { status: 400 }
    );
  }

  const accepted = await acceptOrganizationInvitationByToken({
    token,
    userId,
    email,
  });
  if (!accepted) {
    return NextResponse.json({ error: "Invitation is invalid or expired" }, { status: 400 });
  }
  broadcastOrgMembersChanged(accepted.orgId, { kind: "accepted", userId });
  return NextResponse.json({ ok: true, orgId: accepted.orgId, role: accepted.role });
}
