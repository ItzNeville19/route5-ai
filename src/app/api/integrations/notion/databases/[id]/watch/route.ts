import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { notionRetrieveDatabase } from "@/lib/integrations/notion-api";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getNotionAccessToken } from "@/lib/integrations/notion-token";
import { upsertNotionWatchedDatabaseRow } from "@/lib/integrations/notion-store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "notion:watch", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  const { id: rawId } = await ctx.params;
  const databaseId = decodeURIComponent(rawId);

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const integ = await getNotionIntegrationForOrg(orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }
    const token = getNotionAccessToken(integ);
    if (!token) return NextResponse.json({ error: "No token" }, { status: 503 });

    const db = await notionRetrieveDatabase(token, databaseId);
    const name = (db.title ?? []).map((t) => t.plain_text ?? "").join("").trim() || "Untitled";
    await upsertNotionWatchedDatabaseRow({
      orgId,
      notionDatabaseId: databaseId,
      databaseName: name,
      databaseUrl: db.url ?? null,
      watching: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
