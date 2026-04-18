import { NextResponse } from "next/server";
import { collectAllDatabaseIds, exchangeNotionOAuthCode } from "@/lib/integrations/notion-api";
import { verifyNotionOAuthState } from "@/lib/integrations/notion-oauth-state";
import { checkPlanLimit } from "@/lib/billing/gate";
import {
  getNotionIntegrationForOrg,
  upsertNotionIntegration,
} from "@/lib/integrations/org-integrations-store";
import { replaceNotionWatchedDatabasesForOrg } from "@/lib/integrations/notion-store";
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
    return NextResponse.redirect(`${redirectBase}?notion=error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?notion=error&reason=missing_params`);
  }

  const userId = verifyNotionOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(`${redirectBase}?notion=error&reason=invalid_state`);
  }

  const orgId = await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/notion/callback`;

  try {
    const prior = await getNotionIntegrationForOrg(orgId);
    if (!prior || prior.status !== "connected") {
      const gate = await checkPlanLimit(orgId, "integrations");
      if (!gate.allowed) {
        return NextResponse.redirect(`${redirectBase}?notion=error&reason=plan_limit`);
      }
    }
    const tok = await exchangeNotionOAuthCode(code, redirectUri);
    await upsertNotionIntegration({
      orgId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      workspaceId: tok.workspace_id,
      workspaceName: tok.workspace_name ?? null,
      botId: tok.bot_id ?? null,
    });
    const dbs = await collectAllDatabaseIds(tok.access_token);
    await replaceNotionWatchedDatabasesForOrg(
      orgId,
      dbs.map((d) => ({ id: d.id, name: d.name, url: d.url }))
    );
  } catch {
    return NextResponse.redirect(`${redirectBase}?notion=error&reason=oauth_failed`);
  }

  return NextResponse.redirect(`${redirectBase}?notion=connected`);
}
