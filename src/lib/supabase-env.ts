import { looksLikeTutorialOrEmptySecret } from "@/lib/env-template-guards";

/** Server-side Supabase key accepted by this app (service role JWT or secret key). */
export function getSupabaseServiceRoleKey(): string | null {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    "";
  return key || null;
}

/** Browser realtime key alias support (legacy anon + new publishable naming). */
export function getSupabaseRealtimePublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  return key || null;
}

/** True when URL + a real service_role JWT are set (server-side). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return false;
  if (key.startsWith("sb_publishable_")) return false;
  if (looksLikeTutorialOrEmptySecret(key)) return false;
  return true;
}

export function assertValidServiceRoleKey(key: string): void {
  const k = key.trim();
  if (!k) return;
  if (k.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the service_role secret (JWT), not the anon/publishable key. Supabase → Project Settings → API → service_role."
    );
  }
  if (looksLikeTutorialOrEmptySecret(k)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY looks incomplete. Use the service_role JWT from Supabase → Project Settings → API."
    );
  }
}
