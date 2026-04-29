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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 0; attempt < 4; attempt++) {
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
      if (!error) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[user_workspace_prefs upsert]", error.message);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[user_workspace_prefs upsert] exception", e);
      }
    }
    if (attempt < 3) await sleep(180 * 2 ** attempt);
  }
}
