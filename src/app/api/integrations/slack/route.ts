import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getFeaturesForTier, resolveTierForUser } from "@/lib/entitlements";
import { isSlackIntegrationConfigured } from "@/lib/slack-integration";

export const runtime = "nodejs";

/**
 * Status for the Slack integration page — plan-gated + optional deployment env.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!features.slackConnector) {
    return NextResponse.json({
      ok: true,
      planAllows: false,
      tier,
      configured: false,
      deploymentReady: false,
      message:
        "Slack connector is included on Pro and above. Upgrade under Account → Plans to enable workflows and paste-to-Desk shortcuts.",
    });
  }

  return NextResponse.json({
    ok: true,
    planAllows: true,
    tier,
    configured: deploymentReady,
    deploymentReady,
    message: deploymentReady
      ? "Deployment has Slack credentials — connector is ready for advanced workflows."
      : "Your plan includes Slack. Ask your admin to add SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL for live routing, or paste Slack exports on Desk today.",
  });
}
