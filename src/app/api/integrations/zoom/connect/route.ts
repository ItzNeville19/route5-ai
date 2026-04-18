import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkPlanLimit } from "@/lib/billing/gate";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { signGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { zoomAuthorizeUrl } from "@/lib/integrations/zoom-oauth";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/login", appBaseUrl()));
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "Zoom OAuth not configured" }, { status: 503 });
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  const existing = await getZoomIntegrationForOrg(orgId);
  if (!existing || existing.status !== "connected") {
    const gate = await checkPlanLimit(orgId, "integrations");
    if (!gate.allowed) {
      return NextResponse.redirect(
        `${appBaseUrl()}/workspace/integrations?billingLimit=integrations`
      );
    }
  }
  const redirectUri = `${appBaseUrl()}/api/integrations/zoom/callback`;
  const state = signGmailOAuthState(userId);
  const url = zoomAuthorizeUrl({ clientId, redirectUri, state });
  return NextResponse.redirect(url);
}
