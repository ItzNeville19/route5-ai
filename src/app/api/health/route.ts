import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { isFigmaConfigured } from "@/lib/figma-api";
import { isGitHubConfigured } from "@/lib/github-api";
import { isLinearConfigured } from "@/lib/linear-api";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getStorageBackend } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Liveness: anonymous callers get only `{ ok, t }` (no internal stack fingerprint).
 * Detailed diagnostics when the caller is signed in, or presents `Authorization: Bearer <HEALTH_CHECK_SECRET>`.
 */
export async function GET(req: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const bearerOk = Boolean(secret && authHeader && authHeader === secret);

  const { userId } = await auth();
  if (!bearerOk && !userId) {
    return NextResponse.json({ ok: true, t: Date.now() });
  }

  const openaiConfigured = isOpenAIConfigured();
  const supabaseConfigured = isSupabaseConfigured();
  const storageBackend = getStorageBackend();
  return NextResponse.json({
    ok: true,
    t: Date.now(),
    storageBackend,
    supabaseConfigured,
    /** True when using the automatic local SQLite file (`data/route5.sqlite`). */
    localDatabaseActive: storageBackend === "sqlite",
    openaiConfigured,
    linearConfigured: isLinearConfigured(),
    githubConfigured: isGitHubConfigured(),
    figmaConfigured: isFigmaConfigured(),
    extractionMode: openaiConfigured ? "ai" : "offline",
    storageReady: true,
  });
}
