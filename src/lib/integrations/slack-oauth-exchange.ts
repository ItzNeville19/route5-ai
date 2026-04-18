export type SlackOAuthAccessResult = {
  accessToken: string;
  refreshToken: string | null;
  teamId: string;
  teamName: string | null;
  botUserId: string | null;
  scope: string;
  incomingWebhookUrl: string | null;
};

export async function exchangeSlackOAuthCode(code: string, redirectUri: string): Promise<SlackOAuthAccessResult> {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth not configured");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json()) as {
    ok?: boolean;
    access_token?: string;
    refresh_token?: string;
    team?: { id?: string; name?: string };
    bot_user_id?: string;
    scope?: string;
    incoming_webhook?: { url?: string };
    error?: string;
  };
  if (!j.ok || !j.access_token || !j.team?.id) {
    throw new Error(j.error || "oauth.v2.access failed");
  }
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? null,
    teamId: j.team.id,
    teamName: j.team.name ?? null,
    botUserId: j.bot_user_id ?? null,
    scope: j.scope ?? "",
    incomingWebhookUrl: j.incoming_webhook?.url ?? null,
  };
}

export async function revokeSlackToken(token: string): Promise<void> {
  const res = await fetch("https://slack.com/api/auth.revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams({ token }),
  });
  await res.json().catch(() => ({}));
}
