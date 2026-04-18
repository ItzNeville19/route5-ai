import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { signGmailOAuthState } from "@/lib/integrations/gmail-oauth-state";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { gmailOAuthScopes } from "@/lib/integrations/gmail-google";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", appBaseUrl()));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured (GOOGLE_CLIENT_ID)" }, { status: 503 });
  }
  await ensureOrganizationForClerkUser(userId);
  const redirectUri = `${appBaseUrl()}/api/integrations/gmail/callback`;
  const state = signGmailOAuthState(userId);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", gmailOAuthScopes());
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
