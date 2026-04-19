import crypto from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export type OrgRole = "admin" | "manager" | "member";
export type OrgMemberStatus = "active" | "invited" | "removed";

export type OrgMembership = {
  orgId: string;
  userId: string;
  role: OrgRole;
  status: OrgMemberStatus;
  joinedAt: string;
};

export type OrganizationMemberRow = {
  userId: string;
  role: OrgRole;
  status: OrgMemberStatus;
  joinedAt: string;
  invitedBy: string | null;
};

export type OrgInvitationRow = {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  createdAt: string;
};

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * When a user has both a personal workspace org (organizations.clerk_user_id === user)
 * and a shared org they joined via invite, billing and limits must follow the **shared**
 * org (the admin's subscription). Prefer those memberships; otherwise fall back to personal.
 */
function pickPrimaryMembershipRow(
  rows: Array<{
    org_id: string;
    user_id: string;
    role: OrgRole;
    status: OrgMemberStatus;
    joined_at: string;
    org_owner_clerk_id: string;
  }>,
  userId: string
): (typeof rows)[number] | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0] ?? null;
  const shared = rows.filter((r) => r.org_owner_clerk_id !== userId);
  const pool = shared.length > 0 ? shared : rows;
  return [...pool].sort(
    (a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
  )[0] ?? null;
}

export async function getActiveMembershipForUser(userId: string): Promise<OrgMembership | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data: memberRows, error: mErr } = await supabase
        .from("org_members")
        .select("org_id, user_id, role, status, joined_at")
        .eq("user_id", userId)
        .eq("status", "active");
      if (mErr) throw mErr;
      const members = memberRows ?? [];
      if (members.length === 0) return null;

      const orgIds = [...new Set(members.map((m) => String(m.org_id)))];
      const { data: orgRows, error: oErr } = await supabase
        .from("organizations")
        .select("id, clerk_user_id")
        .in("id", orgIds);
      if (oErr) throw oErr;
      const ownerByOrgId = new Map(
        (orgRows ?? []).map((o) => [String(o.id), String(o.clerk_user_id)])
      );

      const normalized = members.map((row) => ({
        org_id: String(row.org_id),
        user_id: String(row.user_id),
        role: row.role as OrgRole,
        status: row.status as OrgMemberStatus,
        joined_at: String(row.joined_at),
        org_owner_clerk_id: ownerByOrgId.get(String(row.org_id)) ?? userId,
      }));
      const picked = pickPrimaryMembershipRow(normalized, userId);
      if (!picked) return null;
      return {
        orgId: picked.org_id,
        userId: picked.user_id,
        role: picked.role,
        status: picked.status,
        joinedAt: picked.joined_at,
      };
    } catch {
      return null;
    }
  }

  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT om.org_id, om.user_id, om.role, om.status, om.joined_at, o.clerk_user_id AS org_owner_clerk_id
       FROM org_members om
       JOIN organizations o ON o.id = om.org_id
       WHERE om.user_id = ? AND om.status = 'active'
       ORDER BY om.joined_at ASC`
    )
    .all(userId) as Array<{
      org_id: string;
      user_id: string;
      role: OrgRole;
      status: OrgMemberStatus;
      joined_at: string;
      org_owner_clerk_id: string;
    }>;
  const picked = pickPrimaryMembershipRow(rows, userId);
  if (!picked) return null;
  return {
    orgId: picked.org_id,
    userId: picked.user_id,
    role: picked.role,
    status: picked.status,
    joinedAt: picked.joined_at,
  };
}

export async function ensureOrgMember(params: {
  orgId: string;
  userId: string;
  role: OrgRole;
  invitedBy?: string | null;
  status?: OrgMemberStatus;
}): Promise<void> {
  const now = new Date().toISOString();
  const status = params.status ?? "active";
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { error } = await supabase.from("org_members").upsert(
        {
          org_id: params.orgId,
          user_id: params.userId,
          role: params.role,
          invited_by: params.invitedBy ?? null,
          status,
          joined_at: now,
          updated_at: now,
        },
        { onConflict: "org_id,user_id" }
      );
      if (error) throw error;
      return;
    } catch {
      return;
    }
  }

  const d = getSqliteHandle();
  const existing = d
    .prepare(`SELECT id FROM org_members WHERE org_id = ? AND user_id = ?`)
    .get(params.orgId, params.userId) as { id: string } | undefined;
  if (existing) {
    d.prepare(
      `UPDATE org_members
       SET role = ?, invited_by = ?, status = ?, updated_at = ?
       WHERE id = ?`
    ).run(params.role, params.invitedBy ?? null, status, now, existing.id);
    return;
  }
  d.prepare(
    `INSERT INTO org_members (id, org_id, user_id, role, invited_by, joined_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    params.orgId,
    params.userId,
    params.role,
    params.invitedBy ?? null,
    now,
    status,
    now,
    now
  );
}

export async function listOrganizationMembers(orgId: string): Promise<OrganizationMemberRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_members")
      .select("user_id, role, status, joined_at, invited_by")
      .eq("org_id", orgId)
      .neq("status", "removed")
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      role: row.role as OrgRole,
      status: row.status as OrgMemberStatus,
      joinedAt: String(row.joined_at),
      invitedBy: row.invited_by ? String(row.invited_by) : null,
    }));
  }

  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT user_id, role, status, joined_at, invited_by
       FROM org_members
       WHERE org_id = ? AND status <> 'removed'
       ORDER BY joined_at ASC`
    )
    .all(orgId) as {
    user_id: string;
    role: OrgRole;
    status: OrgMemberStatus;
    joined_at: string;
    invited_by: string | null;
  }[];
  return rows.map((row) => ({
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    invitedBy: row.invited_by ?? null,
  }));
}

export async function createOrganizationInvitation(params: {
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
}): Promise<OrgInvitationRow> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  const token = crypto.randomBytes(24).toString("hex");
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_invitations")
      .insert({
        org_id: params.orgId,
        email: params.email.toLowerCase(),
        role: params.role,
        invited_by: params.invitedBy,
        token,
        expires_at: expiresAt,
      })
      .select("id, org_id, email, role, invited_by, token, expires_at, accepted_at, accepted_by, created_at")
      .single();
    if (error) throw error;
    return {
      id: String(data.id),
      orgId: String(data.org_id),
      email: String(data.email),
      role: data.role as OrgRole,
      invitedBy: String(data.invited_by),
      token: String(data.token),
      expiresAt: String(data.expires_at),
      acceptedAt: data.accepted_at ? String(data.accepted_at) : null,
      acceptedBy: data.accepted_by ? String(data.accepted_by) : null,
      createdAt: String(data.created_at),
    };
  }

  const d = getSqliteHandle();
  const id = crypto.randomUUID();
  const createdAt = now.toISOString();
  d.prepare(
    `INSERT INTO org_invitations (id, org_id, email, role, invited_by, token, expires_at, accepted_at, accepted_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`
  ).run(id, params.orgId, params.email.toLowerCase(), params.role, params.invitedBy, token, expiresAt, createdAt);
  return {
    id,
    orgId: params.orgId,
    email: params.email.toLowerCase(),
    role: params.role,
    invitedBy: params.invitedBy,
    token,
    expiresAt,
    acceptedAt: null,
    acceptedBy: null,
    createdAt,
  };
}

export async function acceptOrganizationInvitationByToken(params: {
  token: string;
  userId: string;
  email: string | null;
}): Promise<{ orgId: string; role: OrgRole } | null> {
  const nowIso = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_invitations")
      .select("id, org_id, email, role, expires_at, accepted_at")
      .eq("token", params.token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.accepted_at) {
      return { orgId: String(data.org_id), role: data.role as OrgRole };
    }
    if (new Date(String(data.expires_at)).getTime() < Date.now()) return null;
    if (params.email && String(data.email).toLowerCase() !== params.email.toLowerCase()) return null;
    await ensureOrgMember({
      orgId: String(data.org_id),
      userId: params.userId,
      role: data.role as OrgRole,
      invitedBy: null,
      status: "active",
    });
    const { error: uErr } = await supabase
      .from("org_invitations")
      .update({ accepted_at: nowIso, accepted_by: params.userId })
      .eq("id", String(data.id));
    if (uErr) throw uErr;
    return { orgId: String(data.org_id), role: data.role as OrgRole };
  }

  const d = getSqliteHandle();
  const row = d
    .prepare(
      `SELECT id, org_id, email, role, expires_at, accepted_at
       FROM org_invitations
       WHERE token = ?`
    )
    .get(params.token) as
    | {
        id: string;
        org_id: string;
        email: string;
        role: OrgRole;
        expires_at: string;
        accepted_at: string | null;
      }
    | undefined;
  if (!row) return null;
  if (row.accepted_at) return { orgId: row.org_id, role: row.role };
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  if (params.email && row.email.toLowerCase() !== params.email.toLowerCase()) return null;
  await ensureOrgMember({
    orgId: row.org_id,
    userId: params.userId,
    role: row.role,
    invitedBy: null,
    status: "active",
  });
  d.prepare(`UPDATE org_invitations SET accepted_at = ?, accepted_by = ? WHERE id = ?`).run(
    nowIso,
    params.userId,
    row.id
  );
  return { orgId: row.org_id, role: row.role };
}

export async function updateOrganizationMemberRole(params: {
  orgId: string;
  userId: string;
  role: OrgRole;
}): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_members")
      .update({ role: params.role, updated_at: now })
      .eq("org_id", params.orgId)
      .eq("user_id", params.userId)
      .eq("status", "active")
      .select("user_id");
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_members
       SET role = ?, updated_at = ?
       WHERE org_id = ? AND user_id = ? AND status = 'active'`
    )
    .run(params.role, now, params.orgId, params.userId);
  return r.changes > 0;
}

export async function removeOrganizationMember(params: {
  orgId: string;
  userId: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_members")
      .update({ status: "removed", updated_at: now })
      .eq("org_id", params.orgId)
      .eq("user_id", params.userId)
      .eq("status", "active")
      .select("user_id");
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }
  const d = getSqliteHandle();
  const r = d
    .prepare(
      `UPDATE org_members
       SET status = 'removed', updated_at = ?
       WHERE org_id = ? AND user_id = ? AND status = 'active'`
    )
    .run(now, params.orgId, params.userId);
  return r.changes > 0;
}

export async function requireOrgRole(
  userId: string,
  allowed: OrgRole[]
): Promise<{ ok: true; orgId: string; role: OrgRole } | { ok: false }> {
  const m = await getActiveMembershipForUser(userId);
  if (!m) return { ok: false };
  if (!allowed.includes(m.role)) return { ok: false };
  return { ok: true, orgId: m.orgId, role: m.role };
}
