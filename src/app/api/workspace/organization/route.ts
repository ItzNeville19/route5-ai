import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  createOrganizationInvitation,
  listOrganizationMembers,
  requireOrgRole,
  type OrgRole,
} from "@/lib/workspace/org-members";
import { listOrgCommitmentsForOrgId } from "@/lib/org-commitments/repository";
import { getOrganizationProfile } from "@/lib/workspace/organizations-update";
import { notifyTeamInvited } from "@/lib/notifications/team-invite";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

type MemberDto = {
  userId: string;
  role: OrgRole;
  joinedAt: string;
  status: string;
  invitedBy: string | null;
  activeCommitmentsCount: number;
  profile: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    imageUrl: string | null;
    primaryEmail: string | null;
  };
};

function normalizeRole(input: unknown): OrgRole | null {
  const role = String(input ?? "").trim().toLowerCase();
  if (role === "admin" || role === "manager" || role === "member") return role;
  return null;
}

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin", "manager", "member"]);
  if (!access.ok || access.orgId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [members, org, commitmentPage] = await Promise.all([
      listOrganizationMembers(orgId),
      getOrganizationProfile(orgId),
      listOrgCommitmentsForOrgId(orgId, { limit: 5000, offset: 0 }),
    ]);
    const activeCountByUser = new Map<string, number>();
    for (const row of commitmentPage.rows) {
      if (row.status === "completed") continue;
      activeCountByUser.set(row.ownerId, (activeCountByUser.get(row.ownerId) ?? 0) + 1);
    }
    const clerk = await clerkClient();
    const dto: MemberDto[] = await Promise.all(
      members.map(async (member) => {
        try {
          const u = await clerk.users.getUser(member.userId);
          return {
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            status: member.status,
            invitedBy: member.invitedBy,
            activeCommitmentsCount: activeCountByUser.get(member.userId) ?? 0,
            profile: {
              firstName: u.firstName,
              lastName: u.lastName,
              username: u.username,
              imageUrl: u.imageUrl,
              primaryEmail: u.primaryEmailAddress?.emailAddress ?? null,
            },
          };
        } catch {
          return {
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            status: member.status,
            invitedBy: member.invitedBy,
            activeCommitmentsCount: activeCountByUser.get(member.userId) ?? 0,
            profile: {
              firstName: null,
              lastName: null,
              username: null,
              imageUrl: null,
              primaryEmail: null,
            },
          };
        }
      })
    );
    return NextResponse.json({
      orgId,
      orgName: org.name,
      me: { userId, role: access.role },
      members: dto,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load organization" },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok || access.orgId !== orgId) {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
  }

  let body: { email?: string; role?: string };
  try {
    body = (await req.json()) as { email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = normalizeRole(body.role) ?? "member";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid invite email is required" }, { status: 400 });
  }

  try {
    const invite = await createOrganizationInvitation({
      orgId,
      email,
      role,
      invitedBy: userId,
    });
    const org = await getOrganizationProfile(orgId);
    const base = appBaseUrl();
    const signupUrl = `${base}/sign-up?redirect_url=${encodeURIComponent(
      `/feed?invite=${invite.token}`
    )}`;
    await notifyTeamInvited({
      orgId,
      inviteeEmail: email,
      inviterName: "Route5 admin",
      orgName: org.name,
      signupUrl,
    });
    return NextResponse.json({ ok: true, invitationId: invite.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send invitation" },
      { status: 503 }
    );
  }
}
