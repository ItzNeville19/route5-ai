/** Notion REST API helpers (public OAuth integration). */

export const NOTION_API_BASE = "https://api.notion.com";

export function notionApiVersion(): string {
  return process.env.NOTION_API_VERSION?.trim() || "2022-06-28";
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": notionApiVersion(),
    "Content-Type": "application/json",
  };
}

export type NotionTokenResponse = {
  access_token: string;
  refresh_token?: string;
  bot_id: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string | null;
};

export async function exchangeNotionOAuthCode(
  code: string,
  redirectUri: string
): Promise<NotionTokenResponse> {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Notion OAuth not configured");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${NOTION_API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const j = (await res.json()) as NotionTokenResponse & { error?: string };
  if (!j.access_token || !j.workspace_id) {
    throw new Error(j.error || "notion token exchange failed");
  }
  return j;
}

export async function notionSearchDatabases(
  accessToken: string,
  startCursor?: string
): Promise<{
  results: Array<{
    id: string;
    object: string;
    url?: string;
    title?: Array<{ plain_text?: string }>;
  }>;
  has_more: boolean;
  next_cursor: string | null;
}> {
  const body: Record<string, unknown> = {
    filter: { property: "object", value: "database" },
    page_size: 100,
  };
  if (startCursor) body.start_cursor = startCursor;
  const res = await fetch(`${NOTION_API_BASE}/v1/search`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as {
    results?: Array<{ id: string; object: string; title?: Array<{ plain_text?: string }> }>;
    has_more?: boolean;
    next_cursor?: string | null;
    message?: string;
  };
  if (!res.ok) throw new Error(j.message || "notion search failed");
  return {
    results: j.results ?? [],
    has_more: Boolean(j.has_more),
    next_cursor: j.next_cursor ?? null,
  };
}

export async function notionRetrieveDatabase(
  accessToken: string,
  databaseId: string
): Promise<{ id: string; title?: Array<{ plain_text?: string }>; url?: string }> {
  const res = await fetch(`${NOTION_API_BASE}/v1/databases/${databaseId}`, {
    headers: authHeaders(accessToken),
  });
  const j = (await res.json()) as {
    id?: string;
    title?: Array<{ plain_text?: string }>;
    url?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(j.message || "notion retrieve database failed");
  return {
    id: j.id ?? databaseId,
    title: j.title,
    url: j.url,
  };
}

export async function collectAllDatabaseIds(accessToken: string): Promise<
  Array<{ id: string; name: string; url?: string }>
> {
  const out: Array<{ id: string; name: string; url?: string }> = [];
  let cursor: string | null | undefined;
  for (;;) {
    const page = await notionSearchDatabases(accessToken, cursor ?? undefined);
    for (const r of page.results) {
      if (r.object !== "database") continue;
      const title = (r.title ?? []).map((t) => t.plain_text ?? "").join("").trim() || "Untitled";
      out.push({ id: r.id, name: title, url: r.url });
    }
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export async function notionQueryDatabase(
  accessToken: string,
  databaseId: string,
  params: {
    sinceIso?: string;
    startCursor?: string;
  }
): Promise<{
  results: NotionPageObject[];
  has_more: boolean;
  next_cursor: string | null;
}> {
  const body: Record<string, unknown> = { page_size: 100 };
  if (params.sinceIso) {
    body.filter = {
      timestamp: "last_edited_time",
      last_edited_time: { on_or_after: params.sinceIso },
    };
  }
  if (params.startCursor) body.start_cursor = params.startCursor;

  const res = await fetch(`${NOTION_API_BASE}/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as {
    results?: NotionPageObject[];
    has_more?: boolean;
    next_cursor?: string | null;
    message?: string;
  };
  if (!res.ok) throw new Error(j.message || "notion database query failed");
  return {
    results: j.results ?? [],
    has_more: Boolean(j.has_more),
    next_cursor: j.next_cursor ?? null,
  };
}

export type NotionPageObject = {
  id: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, unknown>;
};

export async function notionRetrievePage(accessToken: string, pageId: string): Promise<NotionPageObject> {
  const res = await fetch(`${NOTION_API_BASE}/v1/pages/${pageId}`, {
    headers: authHeaders(accessToken),
  });
  const j = (await res.json()) as NotionPageObject & { message?: string };
  if (!res.ok) throw new Error(j.message || "notion retrieve page failed");
  return j;
}

type NotionBlock = {
  id: string;
  type?: string;
  has_children?: boolean;
  [key: string]: unknown;
};

export async function notionListBlockChildren(
  accessToken: string,
  blockId: string,
  startCursor?: string
): Promise<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }> {
  const u = new URL(`${NOTION_API_BASE}/v1/blocks/${blockId}/children`);
  u.searchParams.set("page_size", "100");
  if (startCursor) u.searchParams.set("start_cursor", startCursor);
  const res = await fetch(u.toString(), { headers: authHeaders(accessToken) });
  const j = (await res.json()) as {
    results?: NotionBlock[];
    has_more?: boolean;
    next_cursor?: string | null;
    message?: string;
  };
  if (!res.ok) throw new Error(j.message || "notion blocks failed");
  return {
    results: j.results ?? [],
    has_more: Boolean(j.has_more),
    next_cursor: j.next_cursor ?? null,
  };
}

function richTextPlain(rich: unknown): string {
  if (!Array.isArray(rich)) return "";
  return rich
    .map((x) => (typeof x === "object" && x && "plain_text" in x ? String((x as { plain_text?: string }).plain_text ?? "") : ""))
    .join("");
}

function textFromBlock(block: NotionBlock): string {
  const t = block.type;
  if (!t) return "";
  const payload = block[t] as { rich_text?: unknown; checked?: boolean } | undefined;
  if (payload?.rich_text) return richTextPlain(payload.rich_text);
  return "";
}

export async function notionFetchAllBlocksPlainText(accessToken: string, pageOrBlockId: string): Promise<string> {
  const lines: string[] = [];
  async function walk(id: string): Promise<void> {
    let cursor: string | undefined;
    for (;;) {
      const chunk = await notionListBlockChildren(accessToken, id, cursor);
      for (const block of chunk.results) {
        const line = textFromBlock(block);
        if (line.trim()) lines.push(line);
        if (block.has_children && block.id) {
          await walk(block.id);
        }
      }
      if (!chunk.has_more || !chunk.next_cursor) break;
      cursor = chunk.next_cursor ?? undefined;
    }
  }
  await walk(pageOrBlockId);
  return lines.join("\n").slice(0, 100000);
}

export function pageTitleFromProperties(page: NotionPageObject): string {
  const props = page.properties ?? {};
  for (const k of Object.keys(props)) {
    const p = props[k] as { type?: string; title?: Array<{ plain_text?: string }> };
    if (p?.type === "title" && Array.isArray(p.title)) {
      return p.title.map((x) => x.plain_text ?? "").join("").trim() || "Untitled";
    }
  }
  return "Untitled";
}

export async function notionPatchPageSelectStatus(
  accessToken: string,
  pageId: string,
  propertyName: string,
  optionName: string
): Promise<boolean> {
  const res = await fetch(`${NOTION_API_BASE}/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      properties: {
        [propertyName]: { select: { name: optionName } },
      },
    }),
  });
  return res.ok;
}

export async function notionCreateComment(
  accessToken: string,
  pageId: string,
  text: string
): Promise<boolean> {
  const res = await fetch(`${NOTION_API_BASE}/v1/comments`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      parent: { page_id: pageId },
      rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }],
    }),
  });
  return res.ok;
}

/** Find a select or status property suitable for "Done" (name contains Status or first select). */
export function findStatusLikeProperty(
  properties: Record<string, unknown> | undefined
): { name: string; kind: "select" | "status" } | null {
  if (!properties) return null;
  const keys = Object.keys(properties);
  const lower = keys.map((k) => ({ k, low: k.toLowerCase() }));
  const statusKey = lower.find((x) => x.low === "status" || x.low.includes("status"));
  if (statusKey) {
    const t = (properties[statusKey.k] as { type?: string })?.type;
    if (t === "select") return { name: statusKey.k, kind: "select" };
    if (t === "status") return { name: statusKey.k, kind: "status" };
  }
  for (const k of keys) {
    const t = (properties[k] as { type?: string })?.type;
    if (t === "select") return { name: k, kind: "select" };
  }
  for (const k of keys) {
    const t = (properties[k] as { type?: string })?.type;
    if (t === "status") return { name: k, kind: "status" };
  }
  return null;
}

const DONE_CANDIDATES = ["Done", "Complete", "Completed"];

export async function notionMarkPageDoneBestEffort(
  accessToken: string,
  pageId: string,
  properties: Record<string, unknown> | undefined
): Promise<{ ok: boolean; detail: string }> {
  const found = findStatusLikeProperty(properties);
  if (!found) return { ok: false, detail: "no_status_property" };
  for (const name of DONE_CANDIDATES) {
    const res = await fetch(`${NOTION_API_BASE}/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        properties:
          found.kind === "status"
            ? { [found.name]: { status: { name } } }
            : { [found.name]: { select: { name } } },
      }),
    });
    if (res.ok) return { ok: true, detail: "ok" };
  }
  return { ok: false, detail: "no_matching_done_option" };
}
