/**
 * GitHub REST (server only). Credentials come from the deployment environment.
 * List: assigned issues across repos. Import: issue URL or owner/repo#number.
 * @see https://docs.github.com/en/rest/issues/issues
 */

const GITHUB_API = "https://api.github.com";

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim());
}

export type GitHubIssueRow = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  state: string;
  repoFullName: string;
};

type GhIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  pull_request?: unknown;
  repository?: { full_name?: string };
  repository_url?: string;
};

function repoFromIssue(i: GhIssue): string {
  const direct = i.repository?.full_name?.trim();
  if (direct) return direct;
  const url = i.repository_url?.trim();
  if (url) {
    const m = url.match(/\/repos\/([^/]+\/[^/]+)\/?$/);
    if (m) return m[1];
  }
  return "";
}

function mapIssue(i: GhIssue): GitHubIssueRow | null {
  if (i.pull_request) return null;
  const repoFullName = repoFromIssue(i);
  if (!repoFullName) return null;
  return {
    id: i.id,
    number: i.number,
    title: i.title,
    body: i.body,
    htmlUrl: i.html_url,
    state: i.state,
    repoFullName,
  };
}

async function ghFetch(path: string): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "GitHub integration is not available." };
  }
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, error: `GitHub response not JSON (${res.status})` };
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : `GitHub HTTP ${res.status}`;
    return { ok: false, error: msg };
  }
  return { ok: true, json };
}

/** Issues assigned to the token user, newest activity first (excludes PRs). */
export async function githubListAssignedIssues(): Promise<
  { ok: true; issues: GitHubIssueRow[] } | { ok: false; error: string }
> {
  const path =
    "/issues?filter=assigned&state=all&per_page=20&sort=updated&direction=desc";
  const res = await ghFetch(path);
  if (!res.ok) return res;
  if (!Array.isArray(res.json)) {
    return { ok: false, error: "Unexpected GitHub list response" };
  }
  const issues: GitHubIssueRow[] = [];
  for (const row of res.json) {
    if (!row || typeof row !== "object") continue;
    const m = mapIssue(row as GhIssue);
    if (m) issues.push(m);
  }
  return { ok: true, issues };
}

export function parseGitHubIssueRef(ref: string): { owner: string; repo: string; number: number } | null {
  const t = ref.trim();
  if (!t) return null;
  const urlMatch = t.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
      number: Number(urlMatch[3]),
    };
  }
  const short = t.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (short) {
    return { owner: short[1], repo: short[2], number: Number(short[3]) };
  }
  return null;
}

export async function githubFetchIssueForImport(ref: string): Promise<
  | { ok: true; issue: GitHubIssueRow; bodyForExtraction: string }
  | { ok: false; error: string }
> {
  const parsed = parseGitHubIssueRef(ref);
  if (!parsed || !Number.isFinite(parsed.number) || parsed.number < 1) {
    return {
      ok: false,
      error: "Expected a GitHub issue URL or owner/repo#123.",
    };
  }
  const path = `/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
  const res = await ghFetch(path);
  if (!res.ok) return res;
  const row = res.json as GhIssue;
  if (!row || typeof row !== "object" || typeof row.html_url !== "string") {
    return { ok: false, error: "Issue not found." };
  }
  if (row.pull_request) {
    return { ok: false, error: "That URL is a pull request, not an issue." };
  }
  const repoFullName = `${parsed.owner}/${parsed.repo}`;
  const issue: GitHubIssueRow = {
    id: row.id,
    number: row.number,
    title: row.title,
    body: row.body ?? null,
    htmlUrl: row.html_url,
    state: row.state,
    repoFullName,
  };
  const bodyForExtraction = [
    `GitHub ${repoFullName}#${issue.number}`,
    issue.htmlUrl,
    `State: ${issue.state}`,
    "",
    `## ${issue.title}`,
    "",
    (issue.body ?? "").trim(),
  ]
    .filter((l) => l !== "")
    .join("\n");
  return { ok: true, issue, bodyForExtraction };
}
