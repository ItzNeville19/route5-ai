import { NextResponse } from "next/server";
import { verifyGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { checkPlanLimit } from "@/lib/billing/gate";
import { exchangeZoomCode, zoomApiGet } from "@/lib/integrations/zoom-oauth";
import { upsertZoomIntegration, getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const base = `${appBaseUrl()}/workspace/integrations`;
  if (err) return NextResponse.redirect(`${base}?zoom=error&reason=${encodeURIComponent(err)}`);
  if (!code || !state) return NextResponse.redirect(`${base}?zoom=error&reason=missing_params`);
  const userId = verifyGmailOAuthState(state);
  if (!userId) return NextResponse.redirect(`${base}?zoom=error&reason=invalid_state`);

  const orgId = await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/zoom/callback`;
  try {
    const prior = await getZoomIntegrationForOrg(orgId);
    if (!prior || prior.status !== "connected") {
      const gate = await checkPlanLimit(orgId, "integrations");
      if (!gate.allowed) return NextResponse.redirect(`${base}?zoom=error&reason=plan_limit`);
    }
    const tok = await exchangeZoomCode({ code, redirectUri });
    const me = await zoomApiGet<{ id?: string; email?: string; account_id?: string }>(
      tok.access_token,
      "/users/me"
    );
    const accountId = String(me.account_id ?? me.id ?? "zoom");
    const label = me.email ?? me.id ?? "Zoom";
    const exp = Date.now() + (tok.expires_in ?? 3600) * 1000;
    await upsertZoomIntegration({
      orgId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      accountId,
      userLabel: label,
      scope: tok.scope,
      accessTokenExpiresAtMs: exp,
    });
  } catch {
    return NextResponse.redirect(`${base}?zoom=error&reason=oauth_failed`);
  }
  return NextResponse.redirect(`${base}?zoom=connected`);
}
