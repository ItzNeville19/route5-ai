import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getFeaturesForTier, resolveTierForUser } from "@/lib/entitlements";
import { isSlackIntegrationConfigured } from "@/lib/slack-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";

export const runtime = "nodejs";

/**
 * Status for the Slack integration page — plan-gated + optional deployment env + OAuth row.
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
  const deploymentReady = isSlackIntegrationConfigured();

  let slackOAuth: {
    connected: boolean;
    teamName: string | null;
    connectedAt: string | null;
    metadata: { monitored_channel_ids?: string[]; digest_channel_id?: string | null; escalation_channel_id?: string | null };
  } | null = null;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const row = await getSlackIntegrationForOrg(orgId);
    if (row) {
      slackOAuth = {
        connected: row.status === "connected",
        teamName: row.teamName,
        connectedAt: row.connectedAt,
        metadata: {
          monitored_channel_ids: row.metadata.monitored_channel_ids,
          digest_channel_id: row.metadata.digest_channel_id ?? null,
          escalation_channel_id: row.metadata.escalation_channel_id ?? null,
        },
      };
    }
  } catch {
    slackOAuth = null;
  }

  if (!features.slackConnector) {
    return NextResponse.json({
      ok: true,
      planAllows: false,
      tier,
      configured: false,
      deploymentReady: false,
      slackOAuth,
      message:
        "Slack connector is included on Pro and above. Upgrade under Account → Plans to enable workflows and paste-to-Desk shortcuts.",
    });
  }

  return NextResponse.json({
    ok: true,
    planAllows: true,
    tier,
    configured: deploymentReady || Boolean(slackOAuth?.connected),
    deploymentReady,
    slackOAuth,
    message: slackOAuth?.connected
      ? `Connected to Slack workspace${slackOAuth.teamName ? ` (${slackOAuth.teamName})` : ""}.`
      : deploymentReady
        ? "Deployment has Slack credentials — connector is ready for advanced workflows."
        : "Your plan includes Slack. Connect OAuth or ask your admin to add bot credentials for server-side routing.",
  });
}
