import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { orgUiPolicyToStorageJson, parseOrgUiPolicy, type OrgUiPolicy } from "@/lib/org-ui-policy";
import { ensureSqliteOrganizationMirror, getSqliteHandle } from "@/lib/workspace/sqlite";

export async function updateOrganizationProfile(
  orgId: string,
  fields: {
    name?: string;
    primaryUseCase?: string | null;
    uiPolicy?: OrgUiPolicy | null;
    actorUserId?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const row: Record<string, unknown> = { updated_at: now };
      if (fields.name !== undefined) row.name = fields.name;
      if (fields.primaryUseCase !== undefined) row.primary_use_case = fields.primaryUseCase;
      if (fields.uiPolicy !== undefined) {
        if (fields.uiPolicy === null) row.ui_policy = null;
        else {
          const s = orgUiPolicyToStorageJson(fields.uiPolicy);
          row.ui_policy = s === null ? null : (JSON.parse(s) as object);
        }
      }
      const { error } = await supabase.from("organizations").update(row).eq("id", orgId);
      if (error) throw error;
      return;
    } catch (error) {
      console.warn("[organizations-update] Supabase update failed; falling back to SQLite", error);
    }
  }
  const d = getSqliteHandle();
  let cur = d
    .prepare(`SELECT name, primary_use_case, ui_policy FROM organizations WHERE id = ?`)
    .get(orgId) as
    | { name: string; primary_use_case: string | null; ui_policy: string | null }
    | undefined;
  if (!cur && fields.actorUserId) {
    ensureSqliteOrganizationMirror(orgId, fields.actorUserId);
    cur = d
      .prepare(`SELECT name, primary_use_case, ui_policy FROM organizations WHERE id = ?`)
      .get(orgId) as
      | { name: string; primary_use_case: string | null; ui_policy: string | null }
      | undefined;
  }
  if (!cur) throw new Error("ORG_NOT_FOUND");
  const name = fields.name !== undefined ? fields.name : cur.name;
  const pu =
    fields.primaryUseCase !== undefined ? fields.primaryUseCase : cur.primary_use_case ?? null;
  let uiPolicyStr: string | null;
  if (fields.uiPolicy !== undefined) {
    if (fields.uiPolicy === null) {
      uiPolicyStr = null;
    } else {
      uiPolicyStr = orgUiPolicyToStorageJson(fields.uiPolicy);
    }
  } else {
    uiPolicyStr = cur.ui_policy ?? null;
  }
  d.prepare(
    `UPDATE organizations SET name = ?, primary_use_case = ?, ui_policy = ?, updated_at = ? WHERE id = ?`
  ).run(name, pu, uiPolicyStr, now, orgId);
}

export async function getOrganizationProfile(orgId: string): Promise<{
  name: string;
  primaryUseCase: string | null;
  uiPolicy: OrgUiPolicy;
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("name, primary_use_case, ui_policy")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      const r = data as {
        name: string;
        primary_use_case: string | null;
        ui_policy: unknown;
      };
      return {
        name: r.name,
        primaryUseCase: r.primary_use_case,
        uiPolicy: parseOrgUiPolicy(r.ui_policy),
      };
    } catch (e) {
      console.warn("[organizations-update] getOrganizationProfile Supabase failed; using SQLite", e);
    }
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT name, primary_use_case, ui_policy FROM organizations WHERE id = ?`)
    .get(orgId) as
    | { name: string; primary_use_case: string | null; ui_policy: string | null }
    | undefined;
  if (!row) throw new Error("ORG_NOT_FOUND");
  let raw: unknown = null;
  if (row.ui_policy) {
    try {
      raw = JSON.parse(row.ui_policy) as unknown;
    } catch {
      raw = null;
    }
  }
  return { name: row.name, primaryUseCase: row.primary_use_case, uiPolicy: parseOrgUiPolicy(raw) };
}
