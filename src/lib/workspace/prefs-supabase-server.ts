import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";

function isPlainPrefs(x: unknown): x is WorkspacePrefsV1 {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export async function fetchWorkspacePrefsFromSupabase(
  clerkUserId: string
): Promise<Partial<WorkspacePrefsV1> | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("user_workspace_prefs")
      .select("prefs,updated_at")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.prefs as unknown;
    return isPlainPrefs(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function upsertWorkspacePrefsSupabase(
  clerkUserId: string,
  prefs: WorkspacePrefsV1
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("user_workspace_prefs").upsert(
      {
        clerk_user_id: clerkUserId,
        prefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" }
    );
    if (error) throw error;
  } catch {
    /* prefs remain on Clerk */
  }
}
