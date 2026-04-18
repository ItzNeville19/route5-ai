import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPlanLimit } from "@/lib/billing/gate";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getTeamsIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { signGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { teamsAuthorizeUrl } from "@/lib/integrations/teams-oauth";

export const runtime = "nodejs";

const TEAMS_SCOPES = [
  "offline_access",
  "User.Read",
  "Team.ReadBasic.All",
  "ChannelMessage.Read.All",
  "Calendars.ReadWrite",
].join(" ");

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/login", appBaseUrl()));
  const clientId = process.env.TEAMS_CLIENT_ID?.trim();
  const tenant = process.env.TEAMS_TENANT_ID?.trim() || "common";
  if (!clientId) {
    return NextResponse.json({ error: "Teams OAuth not configured" }, { status: 503 });
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  const existing = await getTeamsIntegrationForOrg(orgId);
  if (!existing || existing.status !== "connected") {
    const gate = await checkPlanLimit(orgId, "integrations");
    if (!gate.allowed) {
      return NextResponse.redirect(`${appBaseUrl()}/workspace/integrations?billingLimit=integrations`);
    }
  }
  const redirectUri = `${appBaseUrl()}/api/integrations/teams/callback`;
  const state = signGmailOAuthState(userId);
  const url = teamsAuthorizeUrl({
    tenantId: tenant,
    clientId,
    redirectUri,
    state,
    scope: TEAMS_SCOPES,
  });
  return NextResponse.redirect(url);
}
