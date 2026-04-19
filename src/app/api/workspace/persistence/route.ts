import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { isSupabaseConfigured } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

/**
 * Tells the client whether workspace data can persist on this deployment.
 * No secrets are returned — only booleans.
 */
export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const serviceConfigured = isSupabaseConfigured();
  const anonConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
  const onVercel = process.env.VERCEL === "1";

  return NextResponse.json(
    {
      serviceConfigured,
      anonConfigured,
      /** Serverless production cannot rely on SQLite file storage — projects/chat need Supabase. */
      deploymentNeedsSupabase: onVercel && !serviceConfigured,
      /** Chat realtime unread badges (browser) need anon + URL. */
      realtimeReady: serviceConfigured && anonConfigured,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
