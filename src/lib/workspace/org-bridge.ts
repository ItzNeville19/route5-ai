import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";

/**
 * Ensures a single organization row exists for this Clerk user (1:1 for now),
 * backfills `projects.org_id` where null. Safe to call on every request; idempotent.
 */
export async function ensureOrganizationForClerkUser(userId: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("organizations")
        .upsert(
          { clerk_user_id: userId, name: "Workspace", updated_at: now },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single();
      if (error) throw error;
      const orgId = (data as { id: string }).id;
      const { error: patchErr } = await supabase
        .from("projects")
        .update({ org_id: orgId })
        .eq("clerk_user_id", userId)
        .is("org_id", null);
      if (patchErr) throw patchErr;
      return orgId;
    } catch (e) {
      console.error(
        "[org-bridge] Supabase organization sync failed — falling back to embedded SQLite. Fix Supabase env/migrations if you expect Postgres.",
        e
      );
    }
  }
  return sqlite.ensureOrganizationForClerkUser(userId);
}
