const GMAIL_SCOPE = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function gmailOAuthScopes(): string {
  return GMAIL_SCOPE;
}

export async function exchangeGoogleOAuthCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string | null; expires_in: number; scope: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
  if (!j.access_token) throw new Error(j.error || "token exchange failed");
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? null,
    expires_in: j.expires_in ?? 3600,
    scope: j.scope ?? "",
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(j.error || "refresh failed");
  return { access_token: j.access_token, expires_in: j.expires_in ?? 3600 };
}

export async function revokeGoogleRefreshToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch(() => {});
}

export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string; historyId?: string }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = (await res.json()) as {
    emailAddress?: string;
    historyId?: string | number;
    error?: { message?: string };
  };
  if (!j.emailAddress) throw new Error(j.error?.message || "profile failed");
  return {
    emailAddress: j.emailAddress,
    historyId: j.historyId != null ? String(j.historyId) : undefined,
  };
}

export async function gmailUsersWatch(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
    }),
  });
  const j = (await res.json()) as {
    historyId?: string;
    expiration?: string;
    error?: { message?: string };
  };
  if (!j.historyId || j.expiration == null) {
    throw new Error(j.error?.message || "watch failed");
  }
  const expMs = Number(j.expiration);
  const expIso = Number.isFinite(expMs) ? new Date(expMs).toISOString() : String(j.expiration);
  return { historyId: String(j.historyId), expiration: expIso };
}

export async function gmailUsersStop(accessToken: string): Promise<void> {
  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  }).catch(() => {});
}

type HistoryEntry = {
  id?: string;
  messagesAdded?: Array<{ message?: { id?: string; threadId?: string } }>;
};

export async function gmailHistoryList(
  accessToken: string,
  startHistoryId: string
): Promise<{ history: HistoryEntry[]; historyId?: string; staleHistory?: boolean }> {
  const out: HistoryEntry[] = [];
  let pageToken: string | undefined;
  let latestHistoryId: string | undefined;
  for (;;) {
    const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    u.searchParams.set("startHistoryId", startHistoryId);
    u.searchParams.set("historyTypes", "messageAdded");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const j = (await res.json()) as {
      history?: HistoryEntry[];
      historyId?: string;
      nextPageToken?: string;
      error?: { message?: string; code?: number };
    };
    if (j.error?.code === 404) {
      return { history: [], staleHistory: true };
    }
    if (j.error) throw new Error(j.error.message || "history.list failed");
    if (j.history?.length) out.push(...j.history);
    if (j.historyId) latestHistoryId = String(j.historyId);
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return { history: out, historyId: latestHistoryId };
}

export async function gmailMessagesGet(
  accessToken: string,
  messageId: string
): Promise<GmailMessageResource> {
  const u = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  u.searchParams.set("format", "full");
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = (await res.json()) as GmailMessageResource & { error?: { message?: string } };
  if (j.error) throw new Error(j.error.message || "messages.get failed");
  return j;
}

export type GmailMessageResource = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    parts?: Array<{ mimeType?: string; body?: { data?: string; size?: number }; parts?: unknown[] }>;
    body?: { data?: string; size?: number };
  };
};

function decodeB64Url(data: string): string {
  const pad = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
  return Buffer.from((data + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function header(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string | null {
  const low = name.toLowerCase();
  for (const h of headers ?? []) {
    if (h.name?.toLowerCase() === low) return h.value?.trim() ?? null;
  }
  return null;
}

function extractPlainFromParts(
  parts: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }> | undefined
): string {
  if (!parts) return "";
  for (const p of parts) {
    if (p.mimeType === "text/plain" && p.body?.data) return decodeB64Url(p.body.data);
    if (p.parts?.length) {
      const inner = extractPlainFromParts(p.parts as typeof parts);
      if (inner) return inner;
    }
  }
  return "";
}

export function parseGmailMessage(m: GmailMessageResource): {
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  receivedAt: string;
} {
  const id = m.id ?? "";
  const threadId = m.threadId ?? "";
  const headers = m.payload?.headers;
  const fromRaw = header(headers, "From") ?? "";
  const subject = header(headers, "Subject") ?? "";
  let fromEmail = fromRaw;
  let fromName: string | null = null;
  const angle = fromRaw.match(/<([^>]+)>/);
  if (angle) {
    fromEmail = angle[1]?.trim() ?? fromRaw;
    const namePart = fromRaw.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "");
    fromName = namePart || null;
  } else if (fromRaw.includes("@")) {
    fromEmail = fromRaw.trim();
  }

  let bodyText = "";
  if (m.payload?.body?.data) bodyText = decodeB64Url(m.payload.body.data);
  else if (m.payload?.parts) bodyText = extractPlainFromParts(m.payload.parts);

  const internal = m.internalDate ? Number(m.internalDate) : Date.now();
  const receivedAt = new Date(internal).toISOString();

  return {
    gmailMessageId: id,
    gmailThreadId: threadId,
    fromEmail: fromEmail || "unknown",
    fromName,
    subject,
    bodyText: bodyText.slice(0, 50000),
    receivedAt,
  };
}
