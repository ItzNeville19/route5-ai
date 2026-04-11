/**
 * Linear GraphQL (server only). Credentials come from the deployment environment.
 * @see https://developers.linear.app/docs/graphql/working-with-the-graphql-api
 */

const LINEAR_ENDPOINT = "https://api.linear.app/graphql";

export function isLinearConfigured(): boolean {
  return Boolean(process.env.LINEAR_API_KEY?.trim());
}

export type LinearIssueRow = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  stateName: string | null;
  teamKey: string | null;
  teamName: string | null;
};

type GqlErr = { message: string };

async function linearGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const key = process.env.LINEAR_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Linear integration is not available." };
  }
  const res = await fetch(LINEAR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as {
    data?: T;
    errors?: GqlErr[];
  };
  if (!res.ok) {
    return { ok: false, error: `Linear HTTP ${res.status}` };
  }
  if (json.errors?.length) {
    return { ok: false, error: json.errors.map((e) => e.message).join("; ") };
  }
  if (json.data === undefined || json.data === null) {
    return { ok: false, error: "Empty Linear response" };
  }
  return { ok: true, data: json.data };
}

function mapIssueNode(n: {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string;
  state?: { name: string } | null;
  team?: { key: string; name: string } | null;
}): LinearIssueRow {
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    description: n.description ?? null,
    url: n.url,
    stateName: n.state?.name ?? null,
    teamKey: n.team?.key ?? null,
    teamName: n.team?.name ?? null,
  };
}

/** Recent issues across workspaces the key can access. */
export async function linearListRecentIssues(): Promise<
  { ok: true; issues: LinearIssueRow[] } | { ok: false; error: string }
> {
  const qGlobal = `query RecentIssues {
    issues(first: 30, orderBy: updatedAt) {
      nodes {
        id
        identifier
        title
        description
        url
        state { name }
        team { key name }
      }
    }
  }`;

  const r1 = await linearGraphql<{
    issues?: { nodes: Parameters<typeof mapIssueNode>[0][] };
  }>(qGlobal);
  if (r1.ok && (r1.data.issues?.nodes?.length ?? 0) > 0) {
    return { ok: true, issues: r1.data.issues!.nodes.map(mapIssueNode) };
  }

  const qViewer = `query ViewerIssues {
    viewer {
      assignedIssues(first: 30, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          description
          url
          state { name }
          team { key name }
        }
      }
    }
  }`;

  const r2 = await linearGraphql<{
    viewer?: { assignedIssues?: { nodes: Parameters<typeof mapIssueNode>[0][] } };
  }>(qViewer);
  if (r2.ok) {
    const nodes = r2.data.viewer?.assignedIssues?.nodes ?? [];
    return { ok: true, issues: nodes.map(mapIssueNode) };
  }
  if (r1.ok) {
    return { ok: true, issues: [] };
  }
  return { ok: false, error: r2.error };
}

/** `TEAM-123` or UUID */
export async function linearFetchIssueForImport(ref: string): Promise<
  | { ok: true; issue: LinearIssueRow; bodyForExtraction: string }
  | { ok: false; error: string }
> {
  const trimmed = ref.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a Linear issue URL or TEAM-123 identifier." };
  }

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );
  if (uuidMatch) {
    const id = uuidMatch[0];
    const q = `query One($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        url
        state { name }
        team { key name }
      }
    }`;
    const r = await linearGraphql<{ issue: Parameters<typeof mapIssueNode>[0] | null }>(q, {
      id,
    });
    if (!r.ok) return r;
    if (!r.data.issue) {
      return { ok: false, error: "Issue not found for that id." };
    }
    const issue = mapIssueNode(r.data.issue);
    return {
      ok: true,
      issue,
      bodyForExtraction: formatIssueForExtraction(issue),
    };
  }

  const ident = trimmed.replace(/^.*\/issue\//i, "").replace(/[#\s]/g, "");
  const parts = ident.split("-");
  if (parts.length < 2) {
    return { ok: false, error: "Use format TEAM-123 or paste a Linear issue URL." };
  }
  const numStr = parts[parts.length - 1];
  const teamKey = parts.slice(0, -1).join("-");
  const number = parseInt(numStr, 10);
  if (!teamKey || Number.isNaN(number)) {
    return { ok: false, error: "Could not parse team key and issue number." };
  }

  const q = `query ByRef($teamKey: String!, $number: Float!) {
    issues(
      filter: {
        team: { key: { eq: $teamKey } }
        number: { eq: $number }
      }
      first: 1
    ) {
      nodes {
        id
        identifier
        title
        description
        url
        state { name }
        team { key name }
      }
    }
  }`;

  const r = await linearGraphql<{
    issues?: { nodes: Parameters<typeof mapIssueNode>[0][] };
  }>(q, { teamKey, number });

  if (!r.ok) return r;
  const node = r.data.issues?.nodes?.[0];
  if (!node) {
    return { ok: false, error: `No issue ${teamKey}-${number} found.` };
  }
  const issue = mapIssueNode(node);
  return {
    ok: true,
    issue,
    bodyForExtraction: formatIssueForExtraction(issue),
  };
}

export function formatIssueForExtraction(issue: LinearIssueRow): string {
  const head = [
    `Linear ${issue.identifier}`,
    issue.url,
    issue.teamName ? `Team: ${issue.teamName} (${issue.teamKey})` : null,
    issue.stateName ? `State: ${issue.stateName}` : null,
    "",
    `## ${issue.title}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");
  const desc = (issue.description ?? "").trim();
  return desc ? `${head}\n${desc}` : head;
}
