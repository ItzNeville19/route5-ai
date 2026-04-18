import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPlanLimit } from "@/lib/billing/gate";
import { getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { SLACK_OAUTH_BOT_SCOPES } from "@/lib/integrations/slack-constants";
import { signSlackOAuthState } from "@/lib/integrations/slack-oauth-state";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", appBaseUrl()));
  }
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "Slack OAuth is not configured (SLACK_CLIENT_ID)" }, { status: 503 });
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  const existing = await getSlackIntegrationForOrg(orgId);
  if (!existing || existing.status !== "connected") {
    const gate = await checkPlanLimit(orgId, "integrations");
    if (!gate.allowed) {
      return NextResponse.redirect(
        new URL("/workspace/integrations?billingLimit=integrations", appBaseUrl()).toString()
      );
    }
  }
  const redirectUri = `${appBaseUrl()}/api/integrations/slack/callback`;
  const state = signSlackOAuthState(userId);
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SLACK_OAUTH_BOT_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
