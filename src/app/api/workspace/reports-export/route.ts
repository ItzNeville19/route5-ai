import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { isFigmaConfigured } from "@/lib/figma-api";
import { isGitHubConfigured } from "@/lib/github-api";
import { isLinearConfigured } from "@/lib/linear-api";
import {
  getFeaturesForTier,
  resolveTierForUser,
} from "@/lib/entitlements";
import { getWorkspaceSummaryForUser } from "@/lib/workspace/store";

export const runtime = "nodejs";

/**
 * Full workspace report bundle (JSON) — Pro+ only. Same payload shape as the client-side
 * export on Reports; gated so Free cannot retrieve a “full export” even by URL.
 */
export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  let email: string | undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      undefined;
  } catch {
    email = undefined;
  }

  const tier = resolveTierForUser(userId, email);
  const features = getFeaturesForTier(tier);
  if (!features.exportFull) {
    return NextResponse.json(
      {
        error: "Full export requires Pro or higher",
        code: "EXPORT_NOT_ENTITLED",
      },
      { status: 403 }
    );
  }

  try {
    const { projectCount, extractionCount, recent, activity, activitySeries, execution } =
      await getWorkspaceSummaryForUser(userId);
    const payload = {
      exportedAt: new Date().toISOString(),
      tier,
      projectCount,
      extractionCount,
      readiness: {
        openai: isOpenAIConfigured(),
        linear: isLinearConfigured(),
        github: isGitHubConfigured(),
        figma: isFigmaConfigured(),
      },
      activity,
      activitySeries,
      execution,
      recent,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
