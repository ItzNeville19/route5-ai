import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: { url: string; key: string; client: SupabaseClient } | undefined;

/** Browser client with anon key — Realtime broadcast only; data still comes from Route5 APIs + Clerk. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  if (cached && cached.url === url && cached.key === key) {
    return cached.client;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cached = { url, key, client };
  return client;
}
