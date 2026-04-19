import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { collectAllDatabaseIds } from "@/lib/integrations/notion-api";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getNotionAccessToken } from "@/lib/integrations/notion-token";
import { listNotionWatchedDatabases } from "@/lib/integrations/notion-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const integ = await getNotionIntegrationForOrg(orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }
    const token = getNotionAccessToken(integ);
    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 503 });
    }
    const remote = await collectAllDatabaseIds(token);
    const local = await listNotionWatchedDatabases(orgId);
    const localById = new Map(local.map((l) => [l.notionDatabaseId, l]));
    const databases = remote.map((d) => {
      const row = localById.get(d.id);
      return {
        id: d.id,
        name: d.name,
        url: d.url ?? null,
        watching: row?.watching ?? false,
      };
    });
    return NextResponse.json({ databases });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
