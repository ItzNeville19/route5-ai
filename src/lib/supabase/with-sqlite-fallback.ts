import { isSupabaseConfigured } from "@/lib/supabase-env";

/**
 * When Supabase is configured, run `supabaseFirst`. If it throws or returns a rejected
 * query error, run `sqliteFallback` so Vercel stays up (paused DB, missing tables, etc.).
 * When Supabase is not configured, only `sqliteFallback` runs.
 */
export async function withSqliteFallback<T>(
  supabaseFirst: () => Promise<T>,
  sqliteFallback: () => T | Promise<T>
): Promise<T> {
  const forceSupabase = process.env.VERCEL === "1";
  if (!isSupabaseConfigured()) {
    if (forceSupabase) {
      throw new Error("Supabase is required in production. Configure NEXT_PUBLIC_SUPABASE_URL and service role key.");
    }
    return sqliteFallback();
  }
  try {
    return await supabaseFirst();
  } catch (e) {
    if (forceSupabase) {
      throw e;
    }
    console.error("[withSqliteFallback] Supabase path failed; using SQLite.", e);
    return sqliteFallback();
  }
}
