import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  createOrganizationInvitation,
  listPendingOrganizationInvitations,
  listOrganizationMembers,
  requireOrgRole,
  updateOrganizationMemberRole,
  type OrgRole,
} from "@/lib/workspace/org-members";
import { countActiveCommitmentsByOwnerForOrg } from "@/lib/org-commitments/active-counts-by-owner";
import {
  getOrganizationProfile,
  updateOrganizationProfile,
} from "@/lib/workspace/organizations-update";
import { defaultOrgUiPolicy, parseOrgUiPolicy, type OrgUiPolicy } from "@/lib/org-ui-policy";
import { notifyTeamInvited } from "@/lib/notifications/team-invite";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { broadcastOrgMembersChanged } from "@/lib/workspace/org-members-broadcast";

export const runtime = "nodejs";

type MemberProfile = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmail: string | null;
};

type MemberDto = {
  userId: string;
  /** Precomputed for clients (avoids raw Clerk ids in UI). */
  displayName: string;
  role: OrgRole;
  joinedAt: string;
  status: string;
  invitedBy: string | null;
  activeCommitmentsCount: number;
  profile: MemberProfile;
};

type PendingInviteDto = {
  id: string;
  email: string;
  role: OrgRole;
  status: "pending";
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
};

function displayNameFromProfile(p: MemberProfile): string {
  const full = [p.firstName, p.lastName]
    .filter((x): x is string => Boolean(x?.trim()))
    .map((x) => x.trim())
    .join(" ");
  if (full) return full;
  if (p.username?.trim()) return p.username.trim();
  const em = p.primaryEmail?.trim();
  if (em) {
    const local = em.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Teammate";
}

function normalizeRole(input: unknown): OrgRole | null {
  const role = String(input ?? "").trim().toLowerCase();
  if (role === "admin" || role === "manager" || role === "member") return role;
  return null;
}

const FOUNDER_ADMIN_EMAILS = new Set(["neville@rayze.xyz"]);

async function ensureFounderAdminAccess({
  userId,
  orgId,
  currentRole,
}: {
  userId: string;
  orgId: string;
  currentRole: OrgRole;
}): Promise<OrgRole> {
  if (currentRole === "admin") return currentRole;
  try {
    const clerk = await clerkClient();
    const me = await clerk.users.getUser(userId);
    const email = me.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (!email || !FOUNDER_ADMIN_EMAILS.has(email)) return currentRole;
    await updateOrganizationMemberRole({ orgId, userId, role: "admin" });
    broadcastOrgMembersChanged(orgId, { kind: "member_updated", userId });
    return "admin";
  } catch {
    return currentRole;
  }
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
  const effectiveRole = await ensureFounderAdminAccess({
    userId,
    orgId,
    currentRole: access.role,
  });

  try {
    const [members, pendingInvitations, activeCountByUser] = await Promise.all([
      listOrganizationMembers(orgId),
      listPendingOrganizationInvitations(orgId),
      countActiveCommitmentsByOwnerForOrg(orgId),
    ]);
    let org: { name: string; uiPolicy: OrgUiPolicy } = {
      name: "Workspace",
      uiPolicy: defaultOrgUiPolicy(),
    };
    try {
      const orgProfile = await getOrganizationProfile(orgId);
      org = { name: orgProfile.name, uiPolicy: orgProfile.uiPolicy };
    } catch (profileErr) {
      console.warn("[workspace/organization] org profile missing; serving safe defaults", profileErr);
    }
    const clerk = await clerkClient();
    const dto: MemberDto[] = await Promise.all(
      members.map(async (member) => {
        try {
          const u = await clerk.users.getUser(member.userId);
          const profile: MemberProfile = {
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
            imageUrl: u.imageUrl,
            primaryEmail: u.primaryEmailAddress?.emailAddress ?? null,
          };
          return {
            userId: member.userId,
            displayName: displayNameFromProfile(profile),
            role: member.role,
            joinedAt: member.joinedAt,
            status: member.status,
            invitedBy: member.invitedBy,
            activeCommitmentsCount: activeCountByUser.get(member.userId) ?? 0,
            profile,
          };
        } catch {
          const profile: MemberProfile = {
            firstName: null,
            lastName: null,
            username: null,
            imageUrl: null,
            primaryEmail: null,
          };
          return {
            userId: member.userId,
            displayName: displayNameFromProfile(profile),
            role: member.role,
            joinedAt: member.joinedAt,
            status: member.status,
            invitedBy: member.invitedBy,
            activeCommitmentsCount: activeCountByUser.get(member.userId) ?? 0,
            profile,
          };
        }
      })
    );
    const inviterIds = [...new Set(pendingInvitations.map((row) => row.invitedBy))];
    const inviterNameById = new Map<string, string>();
    await Promise.all(
      inviterIds.map(async (id) => {
        try {
          const u = await clerk.users.getUser(id);
          inviterNameById.set(
            id,
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
              u.username ||
              u.primaryEmailAddress?.emailAddress ||
              "Teammate"
          );
        } catch {
          inviterNameById.set(id, "Teammate");
        }
      })
    );
    const invitations: PendingInviteDto[] = pendingInvitations.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: "pending",
      invitedBy: row.invitedBy,
      invitedByName: inviterNameById.get(row.invitedBy) ?? "Teammate",
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    }));
    return NextResponse.json({
      orgId,
      orgName: org.name,
      uiPolicy: org.uiPolicy,
      me: { userId, role: effectiveRole },
      members: dto,
      invitations,
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
    const promotedRole = await ensureFounderAdminAccess({
      userId,
      orgId,
      currentRole: access.ok && access.orgId === orgId ? access.role : "member",
    });
    if (promotedRole !== "admin") {
      return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
    }
  }
  if (access.ok && access.orgId === orgId) {
    await ensureFounderAdminAccess({ userId, orgId, currentRole: access.role });
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
    let orgName = "Workspace";
    try {
      const org = await getOrganizationProfile(orgId);
      orgName = org.name;
    } catch (profileErr) {
      console.warn("[workspace/organization] invite created with fallback org name", profileErr);
    }
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
    const inviteUrl = `${base}/invite/${invite.token}`;
    await notifyTeamInvited({
      orgId,
      inviteeEmail: email,
      inviterName,
      orgName,
      inviteUrl,
      invitationToken: invite.token,
    });
    broadcastOrgMembersChanged(orgId, { kind: "invited", invitationId: invite.id });
    return NextResponse.json({ ok: true, invitationId: invite.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send invitation" },
      { status: 503 }
    );
  }
}

export async function PATCH(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok || access.orgId !== orgId) {
    const promotedRole = await ensureFounderAdminAccess({
      userId,
      orgId,
      currentRole: access.ok && access.orgId === orgId ? access.role : "member",
    });
    if (promotedRole !== "admin") {
      return NextResponse.json({ error: "Only admins can update organization settings" }, { status: 403 });
    }
  } else {
    await ensureFounderAdminAccess({ userId, orgId, currentRole: access.role });
  }

  let body: { uiPolicy?: unknown };
  try {
    body = (await req.json()) as { uiPolicy?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.uiPolicy === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const next: OrgUiPolicy = parseOrgUiPolicy(body.uiPolicy);

  try {
    await updateOrganizationProfile(orgId, { uiPolicy: next, actorUserId: userId });
    const org = await getOrganizationProfile(orgId);
    return NextResponse.json({ ok: true, uiPolicy: org.uiPolicy });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update organization" },
      { status: 503 }
    );
  }
}
