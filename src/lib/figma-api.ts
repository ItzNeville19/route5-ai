/**
 * Figma REST API — file text + comments for Route5 import (server-side only).
 * @see https://www.figma.com/developers/api
 */

const FIGMA_API = "https://api.figma.com/v1";

export function isFigmaConfigured(): boolean {
  return Boolean(process.env.FIGMA_ACCESS_TOKEN?.trim());
}

function token(): string | null {
  const t = process.env.FIGMA_ACCESS_TOKEN?.trim();
  return t || null;
}

/** Extract file key from a Figma URL or return the key if already bare. */
export function figmaFileKeyFromInput(input: string): string | null {
  const s = input.trim();
  const patterns = [
    /figma\.com\/(?:file|design|proto)\/([0-9A-Za-z]+)/i,
    /figma\.com\/community\/file\/([0-9A-Za-z]+)/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1]) return m[1];
  }
  if (/^[0-9A-Za-z]{10,128}$/.test(s)) return s;
  return null;
}

type FigmaNode = {
  type?: string;
  name?: string;
  characters?: string;
  children?: FigmaNode[];
};

function walkText(node: FigmaNode | undefined, lines: string[], budget: { left: number }): void {
  if (!node || budget.left <= 0) return;
  if (node.type === "TEXT" && typeof node.characters === "string" && node.characters.trim()) {
    const label = (node.name || "Text").trim();
    const chunk = `${label}: ${node.characters.trim()}`;
    if (chunk.length <= budget.left) {
      lines.push(chunk);
      budget.left -= chunk.length + 1;
    } else {
      lines.push(`${label}: ${node.characters.trim().slice(0, budget.left - label.length - 2)}…`);
      budget.left = 0;
    }
  }
  const kids = node.children;
  if (!Array.isArray(kids)) return;
  for (const c of kids) {
    walkText(c, lines, budget);
    if (budget.left <= 0) return;
  }
}

export type FigmaImportResult =
  | { ok: true; title: string; body: string; fileKey: string }
  | { ok: false; error: string };

const MAX_BODY = 95_000;

/**
 * Pulls file JSON (limited depth) + comments, flattens TEXT nodes into plain text for extraction.
 */
export async function fetchFigmaFileForImport(fileKey: string): Promise<FigmaImportResult> {
  const tok = token();
  if (!tok) {
    return { ok: false, error: "Figma is not configured — set FIGMA_ACCESS_TOKEN on the server." };
  }

  const headers = { "X-Figma-Token": tok };

  const fileRes = await fetch(`${FIGMA_API}/files/${encodeURIComponent(fileKey)}?depth=6`, {
    headers,
    next: { revalidate: 0 },
  });

  if (fileRes.status === 403) {
    return { ok: false, error: "Figma returned 403 — token may lack file access or is invalid." };
  }
  if (fileRes.status === 404) {
    return { ok: false, error: "File not found — check the link or key." };
  }
  if (!fileRes.ok) {
    const errText = await fileRes.text().catch(() => "");
    return { ok: false, error: `Figma file API error (${fileRes.status}). ${errText.slice(0, 200)}` };
  }

  const fileJson = (await fileRes.json()) as { name?: string; document?: FigmaNode };
  const title = typeof fileJson.name === "string" ? fileJson.name : "Figma file";
  const lines: string[] = [`# ${title}`, `File key: ${fileKey}`, ""];
  const budget = { left: MAX_BODY - lines.join("\n").length };
  walkText(fileJson.document, lines, budget);

  let commentsBlock = "";
  try {
    const cRes = await fetch(`${FIGMA_API}/files/${encodeURIComponent(fileKey)}/comments`, {
      headers,
      next: { revalidate: 0 },
    });
    if (cRes.ok) {
      const cj = (await cRes.json()) as {
        comments?: { message?: string; user?: { handle?: string }; created_at?: string }[];
      };
      const comments = cj.comments ?? [];
      if (comments.length > 0) {
        const parts: string[] = ["", "## Comments", ""];
        for (const c of comments.slice(0, 200)) {
          const who = c.user?.handle ?? "user";
          const when = c.created_at ?? "";
          const msg = (c.message ?? "").trim();
          if (!msg) continue;
          parts.push(`- **@${who}** (${when}): ${msg}`);
        }
        commentsBlock = parts.join("\n");
      }
    }
  } catch {
    /* comments optional */
  }

  let body = lines.join("\n") + commentsBlock;
  if (body.length > MAX_BODY) body = body.slice(0, MAX_BODY) + "\n\n…(truncated for Desk limit)";

  const withoutHeader = body.replace(/^#\s[^\n]+\nFile key:[^\n]+\n+/m, "").trim();
  if (withoutHeader.length < 12) {
    return {
      ok: false,
      error:
        "No text layers or comments found at this depth — try a file with visible TEXT nodes or comments, or paste frame notes manually.",
    };
  }

  return { ok: true, title, body, fileKey };
}
