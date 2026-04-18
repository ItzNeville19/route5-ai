import { NextResponse } from "next/server";
import { exchangeSlackOAuthCode } from "@/lib/integrations/slack-oauth-exchange";
import { verifySlackOAuthState } from "@/lib/integrations/slack-oauth-state";
import { checkPlanLimit } from "@/lib/billing/gate";
import {
  getSlackIntegrationForOrg,
  upsertSlackIntegration,
} from "@/lib/integrations/org-integrations-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const redirectBase = `${appBaseUrl()}/workspace/integrations`;

  if (err) {
    return NextResponse.redirect(`${redirectBase}?slack=error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?slack=error&reason=missing_params`);
  }

  const userId = verifySlackOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(`${redirectBase}?slack=error&reason=invalid_state`);
  }

  const orgId = await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/slack/callback`;

  try {
    const prior = await getSlackIntegrationForOrg(orgId);
    if (!prior || prior.status !== "connected") {
      const gate = await checkPlanLimit(orgId, "integrations");
      if (!gate.allowed) {
        return NextResponse.redirect(`${redirectBase}?slack=error&reason=plan_limit`);
      }
    }
    const tok = await exchangeSlackOAuthCode(code, redirectUri);
    await upsertSlackIntegration({
      orgId,
      accessToken: tok.accessToken,
      refreshToken: tok.refreshToken,
      teamId: tok.teamId,
      teamName: tok.teamName,
      botUserId: tok.botUserId,
      scope: tok.scope,
      webhookUrl: tok.incomingWebhookUrl,
    });
  } catch {
    return NextResponse.redirect(`${redirectBase}?slack=error&reason=oauth_failed`);
  }

  return NextResponse.redirect(`${redirectBase}?slack=connected`);
}
