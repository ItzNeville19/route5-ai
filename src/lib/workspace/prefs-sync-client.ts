import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";

/** POST /api/workspace/prefs with exponential backoff — Clerk + Supabase on server. */
export async function postWorkspacePrefsPatch(
  patch: Partial<WorkspacePrefsV1>,
  opts?: { retries?: number }
): Promise<boolean> {
  const retries = opts?.retries ?? 3;
  const body = JSON.stringify({ prefs: patch });

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch("/api/workspace/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body,
      });
      if (r.ok) return true;
    } catch {
      /* transient network */
    }
    if (attempt < retries - 1) {
      await new Promise((res) => setTimeout(res, 220 * 2 ** attempt));
    }
  }
  return false;
}
