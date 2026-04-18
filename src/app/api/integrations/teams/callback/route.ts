import { NextResponse } from "next/server";
import { verifyGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { checkPlanLimit } from "@/lib/billing/gate";
import { exchangeTeamsCode, graphApiGet } from "@/lib/integrations/teams-oauth";
import {
  getTeamsIntegrationForOrg,
  upsertTeamsIntegration,
  updateTeamsIntegrationMetadata,
} from "@/lib/integrations/zoom-teams-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const base = `${appBaseUrl()}/workspace/integrations`;
  const tenant = process.env.TEAMS_TENANT_ID?.trim() || "common";
  if (err) return NextResponse.redirect(`${base}?teams=error&reason=${encodeURIComponent(err)}`);
  if (!code || !state) return NextResponse.redirect(`${base}?teams=error&reason=missing_params`);
  const userId = verifyGmailOAuthState(state);
  if (!userId) return NextResponse.redirect(`${base}?teams=error&reason=invalid_state`);

  const orgId = await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/teams/callback`;
  try {
    const prior = await getTeamsIntegrationForOrg(orgId);
    if (!prior || prior.status !== "connected") {
      const gate = await checkPlanLimit(orgId, "integrations");
      if (!gate.allowed) return NextResponse.redirect(`${base}?teams=error&reason=plan_limit`);
    }
    const tok = await exchangeTeamsCode({ tenantId: tenant, code, redirectUri });
    const me = await graphApiGet<{ id?: string; displayName?: string }>(tok.access_token, "/me");
    const exp = Date.now() + (tok.expires_in ?? 3600) * 1000;
    await upsertTeamsIntegration({
      orgId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      tenantId: tenant,
      userId: String(me.id ?? "unknown"),
      displayName: me.displayName ?? null,
      scope: tok.scope,
      accessTokenExpiresAtMs: exp,
    });

    const secret = process.env.TEAMS_GRAPH_SUBSCRIPTION_SECRET?.trim() ?? "dev-client-state";
    const notificationUrl = `${appBaseUrl()}/api/integrations/teams/webhook`;
    const subBody = {
      changeType: "created",
      notificationUrl,
      resource: "/teams/getAllMessages",
      expirationDateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      clientState: secret,
    };
    try {
      const subRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subBody),
      });
      const subJson = (await subRes.json()) as { id?: string; expirationDateTime?: string };
      if (subJson.id) {
        await updateTeamsIntegrationMetadata(orgId, {
          teams_graph_subscription_id: subJson.id,
          teams_graph_subscription_expires_at: subJson.expirationDateTime ?? null,
        });
      }
    } catch {
      /* subscription may require admin consent */
    }
  } catch {
    return NextResponse.redirect(`${base}?teams=error&reason=oauth_failed`);
  }
  return NextResponse.redirect(`${base}?teams=connected`);
}
