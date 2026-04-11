import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertValidServiceRoleKey } from "@/lib/supabase-env";

/** Recreate client when URL/key change so .env.local updates apply without stale cache. */
let cached: { url: string; key: string; client: SupabaseClient } | undefined;

/**
 * Server-only Supabase client with the service role key.
 * All queries must scope by `clerk_user_id` from the authenticated Clerk session.
 */
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them in .env.local (see .env.example)."
    );
  }
  assertValidServiceRoleKey(key);
  if (cached && cached.url === url && cached.key === key) {
    return cached.client;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cached = { url, key, client };
  return client;
}
