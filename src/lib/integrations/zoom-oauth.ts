const ZOOM_AUTH = "https://zoom.us/oauth/authorize";
const ZOOM_TOKEN = "https://zoom.us/oauth/token";

export function zoomAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(ZOOM_AUTH);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  return u.toString();
}

export async function exchangeZoomCode(params: {
  code: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  scope: string;
}> {
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Zoom OAuth not configured");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const res = await fetch(ZOOM_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  };
  if (!j.access_token) throw new Error(j.error || "zoom token exchange failed");
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_in: j.expires_in ?? 3600,
    scope: j.scope ?? "",
  };
}

export async function refreshZoomAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Zoom OAuth not configured");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(ZOOM_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(j.error || "zoom refresh failed");
  return { access_token: j.access_token, expires_in: j.expires_in ?? 3600 };
}

export async function revokeZoomToken(token: string): Promise<void> {
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  await fetch(
    `https://zoom.us/oauth/revoke?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  ).catch(() => {});
}

export async function zoomApiGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://api.zoom.us/v2${path.startsWith("/") ? path : `/${path}`}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await res.json()) as T;
}
