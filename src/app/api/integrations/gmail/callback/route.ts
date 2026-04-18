import { NextResponse } from "next/server";
import {
  exchangeGoogleOAuthCode,
  getGmailProfile,
  gmailUsersWatch,
} from "@/lib/integrations/gmail-google";
import {
  ensureMeetWorkspaceEventsSubscription,
  fetchGoogleOAuthSub,
} from "@/lib/integrations/gmeet-workspace-subscription";
import { mergeGmailIntegrationMetadata } from "@/lib/integrations/org-integrations-store";
import { verifyGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { checkPlanLimit } from "@/lib/billing/gate";
import {
  getGmailIntegrationForOrg,
  upsertGmailIntegration,
  upsertGmailWatchRow,
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
    return NextResponse.redirect(`${redirectBase}?gmail=error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?gmail=error&reason=missing_params`);
  }

  const userId = verifyGmailOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(`${redirectBase}?gmail=error&reason=invalid_state`);
  }

  const orgId = await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/gmail/callback`;

  try {
    const prior = await getGmailIntegrationForOrg(orgId);
    if (!prior || prior.status !== "connected") {
      const gate = await checkPlanLimit(orgId, "integrations");
      if (!gate.allowed) {
        return NextResponse.redirect(`${redirectBase}?gmail=error&reason=plan_limit`);
      }
    }
    const tok = await exchangeGoogleOAuthCode(code, redirectUri);
    const profile = await getGmailProfile(tok.access_token);
    const expiresAt = Date.now() + (tok.expires_in ?? 3600) * 1000;
    await upsertGmailIntegration({
      orgId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      emailAddress: profile.emailAddress,
      scope: tok.scope,
      accessTokenExpiresAtMs: expiresAt,
    });

    const sub = await fetchGoogleOAuthSub(tok.access_token);
    if (sub) {
      await mergeGmailIntegrationMetadata(orgId, { google_oauth_sub: sub });
      await ensureMeetWorkspaceEventsSubscription(orgId, tok.access_token, sub);
    }

    const topic = process.env.GOOGLE_PUBSUB_TOPIC?.trim();
    if (topic) {
      try {
        const w = await gmailUsersWatch(tok.access_token, topic);
        await upsertGmailWatchRow({
          orgId,
          historyId: w.historyId,
          expirationIso: w.expiration,
        });
      } catch {
        /* watch may fail if Pub/Sub misconfigured — user can renew via cron */
      }
    }
  } catch {
    return NextResponse.redirect(`${redirectBase}?gmail=error&reason=oauth_failed`);
  }

  return NextResponse.redirect(`${redirectBase}?gmail=connected`);
}
