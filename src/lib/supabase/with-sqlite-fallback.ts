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
  if (!isSupabaseConfigured()) {
    return sqliteFallback();
  }
  try {
    return await supabaseFirst();
  } catch (e) {
    console.error("[withSqliteFallback] Supabase path failed; using SQLite.", e);
    return sqliteFallback();
  }
}
