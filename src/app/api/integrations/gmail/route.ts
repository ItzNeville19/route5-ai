import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getFeaturesForTier, resolveTierForUser } from "@/lib/entitlements";
import { isGmailOAuthConfigured } from "@/lib/gmail-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  countGmailCapturedEmails,
  countGmailDecisionsCaptured,
  getGmailIntegrationForOrg,
  getGmailWatchForOrg,
  listRecentGmailDecisionRows,
} from "@/lib/integrations/org-integrations-store";

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
  const deploymentReady = isGmailOAuthConfigured();

  let gmailOAuth: {
    connected: boolean;
    emailAddress: string | null;
    connectedAt: string | null;
    lastUsedAt: string | null;
    watchExpiration: string | null;
    emailsProcessed: number;
    decisionsCaptured: number;
    recentDecisions: Array<{
      id: string;
      subject: string;
      bodyPreview: string;
      confidenceScore: number | null;
      processed: boolean;
      decisionDetected: boolean;
      commitmentId: string | null;
      capturedAt: string;
    }>;
  } | null = null;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getGmailIntegrationForOrg(orgId);
    if (row) {
      const watch = await getGmailWatchForOrg(orgId);
      const processed = await countGmailCapturedEmails(orgId);
      const decisions = await countGmailDecisionsCaptured(orgId);
      const recent = await listRecentGmailDecisionRows(orgId, 5);
      gmailOAuth = {
        connected: row.status === "connected",
        emailAddress: row.teamName,
        connectedAt: row.connectedAt,
        lastUsedAt: row.lastUsedAt,
        watchExpiration: watch?.expiration ?? null,
        emailsProcessed: processed,
        decisionsCaptured: decisions,
        recentDecisions: recent.map((r) => ({
          id: r.id,
          subject: r.subject,
          bodyPreview: r.bodyText.slice(0, 280),
          confidenceScore: r.confidenceScore,
          processed: r.processed,
          decisionDetected: r.decisionDetected,
          commitmentId: r.commitmentId,
          capturedAt: r.capturedAt,
        })),
      };
    }
  } catch {
    gmailOAuth = null;
  }

  if (!features.gmailConnector) {
    return NextResponse.json({
      ok: true,
      planAllows: false,
      tier,
      configured: false,
      deploymentReady: false,
      gmailOAuth,
      message: "Gmail connector is included on Pro and above.",
    });
  }

  return NextResponse.json({
    ok: true,
    planAllows: true,
    tier,
    configured: deploymentReady || Boolean(gmailOAuth?.connected),
    deploymentReady,
    gmailOAuth,
    message: gmailOAuth?.connected
      ? `Gmail connected${gmailOAuth.emailAddress ? ` (${gmailOAuth.emailAddress})` : ""}.`
      : deploymentReady
        ? "Configure Google Cloud and connect your inbox."
        : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Gmail.",
  });
}
