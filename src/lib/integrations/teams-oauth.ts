export function teamsAuthorizeUrl(params: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
}): string {
  const u = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(params.tenantId)}/oauth2/v2.0/authorize`
  );
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", params.scope);
  u.searchParams.set("state", params.state);
  return u.toString();
}

export async function exchangeTeamsCode(params: {
  tenantId: string;
  code: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  scope: string;
}> {
  const clientId = process.env.TEAMS_CLIENT_ID?.trim();
  const clientSecret = process.env.TEAMS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Teams OAuth not configured");
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(params.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  };
  if (!j.access_token) throw new Error(j.error || "teams token exchange failed");
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_in: j.expires_in ?? 3600,
    scope: j.scope ?? "",
  };
}

export async function refreshTeamsAccessToken(params: {
  tenantId: string;
  refreshToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.TEAMS_CLIENT_ID?.trim();
  const clientSecret = process.env.TEAMS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Teams OAuth not configured");
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(params.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    scope: "offline_access https://graph.microsoft.com/.default",
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(j.error || "teams refresh failed");
  return { access_token: j.access_token, expires_in: j.expires_in ?? 3600 };
}

export async function graphApiGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path.startsWith("/") ? path : `/${path}`}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await res.json()) as T;
}
