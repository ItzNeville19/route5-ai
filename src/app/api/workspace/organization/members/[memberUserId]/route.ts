import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  removeOrganizationMember,
  requireOrgRole,
  updateOrganizationMemberRole,
  type OrgRole,
} from "@/lib/workspace/org-members";
import { broadcastOrgMembersChanged } from "@/lib/workspace/org-members-broadcast";

export const runtime = "nodejs";

function normalizeRole(input: unknown): OrgRole | null {
  const value = String(input ?? "").trim().toLowerCase();
  if (value === "admin" || value === "manager" || value === "member") return value;
  return null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ memberUserId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok || access.orgId !== orgId) {
    return NextResponse.json({ error: "Only admins can update roles" }, { status: 403 });
  }

  const { memberUserId } = await ctx.params;
  let body: { role?: string };
  try {
    body = (await req.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const role = normalizeRole(body.role);
  if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (memberUserId === userId && role !== "admin") {
    return NextResponse.json(
      { error: "Admins cannot demote themselves through this endpoint" },
      { status: 400 }
    );
  }
  const ok = await updateOrganizationMemberRole({
    orgId,
    userId: memberUserId,
    role,
  });
  if (ok) broadcastOrgMembersChanged(orgId, { kind: "member_updated", userId: memberUserId });
  return NextResponse.json({ ok });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ memberUserId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok || access.orgId !== orgId) {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }
  const { memberUserId } = await ctx.params;
  if (memberUserId === userId) {
    return NextResponse.json(
      { error: "Admins cannot remove themselves from the organization" },
      { status: 400 }
    );
  }
  const ok = await removeOrganizationMember({ orgId, userId: memberUserId });
  if (ok) broadcastOrgMembersChanged(orgId, { kind: "member_removed", userId: memberUserId });
  return NextResponse.json({ ok });
}
