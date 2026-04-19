import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getFeaturesForTier, resolveTierForUser } from "@/lib/entitlements";
import { isNotionOAuthConfigured } from "@/lib/notion-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  countNotionCapturedPages,
  countNotionDecisionsCaptured,
  countNotionWatchedActive,
  listNotionWatchedDatabases,
  listRecentNotionDecisionRows,
} from "@/lib/integrations/notion-store";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";

export const runtime = "nodejs";

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
  const deploymentReady = isNotionOAuthConfigured();

  let notionOAuth: {
    connected: boolean;
    workspaceName: string | null;
    connectedAt: string | null;
    lastUsedAt: string | null;
    databasesWatched: number;
    pagesProcessed: number;
    decisionsCaptured: number;
    recentDecisions: Array<{
      id: string;
      title: string;
      pagePreview: string;
      confidenceScore: number | null;
      processed: boolean;
      decisionDetected: boolean;
      commitmentId: string | null;
      capturedAt: string;
    }>;
  } | null = null;

  let watchedDatabases: Awaited<ReturnType<typeof listNotionWatchedDatabases>> = [];

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getNotionIntegrationForOrg(orgId);
    if (row) {
      watchedDatabases = await listNotionWatchedDatabases(orgId);
      const watched = await countNotionWatchedActive(orgId);
      const processed = await countNotionCapturedPages(orgId);
      const decisions = await countNotionDecisionsCaptured(orgId);
      const recent = await listRecentNotionDecisionRows(orgId, 5);
      notionOAuth = {
        connected: row.status === "connected",
        workspaceName: row.teamName,
        connectedAt: row.connectedAt,
        lastUsedAt: row.lastUsedAt,
        databasesWatched: watched,
        pagesProcessed: processed,
        decisionsCaptured: decisions,
        recentDecisions: recent.map((r) => ({
          id: r.id,
          title: r.title,
          pagePreview: r.contentText.slice(0, 280),
          confidenceScore: r.confidenceScore,
          processed: r.processed,
          decisionDetected: r.decisionDetected,
          commitmentId: r.commitmentId,
          capturedAt: r.capturedAt,
        })),
      };
    }
  } catch {
    notionOAuth = null;
  }

  if (!features.notionConnector) {
    return NextResponse.json({
      ok: true,
      planAllows: false,
      tier,
      configured: false,
      deploymentReady: false,
      notionOAuth,
      watchedDatabases: [],
      message: "Notion connector is included on Pro and above.",
    });
  }

  return NextResponse.json({
    ok: true,
    planAllows: true,
    tier,
    configured: deploymentReady || Boolean(notionOAuth?.connected),
    deploymentReady,
    notionOAuth,
    watchedDatabases,
    message: notionOAuth?.connected
      ? `Notion connected${notionOAuth.workspaceName ? ` (${notionOAuth.workspaceName})` : ""}.`
      : deploymentReady
        ? "Connect your Notion workspace and share databases with the integration."
        : "Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET.",
  });
}
