import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { isGitHubConfigured } from "@/lib/github-api";
import { isLinearConfigured } from "@/lib/linear-api";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getStorageBackend } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Readiness: OpenAI optional; storage is Supabase when configured, otherwise embedded SQLite.
 */
export async function GET() {
  const openaiConfigured = isOpenAIConfigured();
  const supabaseConfigured = isSupabaseConfigured();
  const storageBackend = getStorageBackend();
  return NextResponse.json({
    ok: true,
    storageBackend,
    supabaseConfigured,
    /** True when using the automatic local SQLite file (`data/route5.sqlite`). */
    localDatabaseActive: storageBackend === "sqlite",
    openaiConfigured,
    linearConfigured: isLinearConfigured(),
    githubConfigured: isGitHubConfigured(),
    extractionMode: openaiConfigured ? "ai" : "offline",
    storageReady: true,
  });
}
