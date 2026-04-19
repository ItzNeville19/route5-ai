import { NextResponse } from "next/server";
import { requireUserIdRedirect } from "@/lib/auth/require-user";
import { checkPlanLimit } from "@/lib/billing/gate";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { signNotionOAuthState } from "@/lib/integrations/notion-oauth-state";
import { appBaseUrl } from "@/lib/integrations/app-url";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserIdRedirect(new URL("/login", appBaseUrl()));
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "Notion OAuth is not configured (NOTION_CLIENT_ID)" }, { status: 503 });
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  const existing = await getNotionIntegrationForOrg(orgId);
  if (!existing || existing.status !== "connected") {
    const gate = await checkPlanLimit(orgId, "integrations");
    if (!gate.allowed) {
      return NextResponse.redirect(
        new URL("/workspace/integrations?billingLimit=integrations", appBaseUrl()).toString()
      );
    }
  }
  const redirectUri = `${appBaseUrl()}/api/integrations/notion/callback`;
  const state = signNotionOAuthState(userId);
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
