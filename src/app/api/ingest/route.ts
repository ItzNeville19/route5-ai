import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { getIngestSecretDiagnostics } from "@/lib/ingest-secret";

export const runtime = "nodejs";

/**
 * Signed-in users: whether automation ingest is enabled and the webhook URL (no secret exposed).
 */
export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  const url = new URL(req.url);
  const webhookUrl = `${url.origin}/api/ingest/webhook`;

  const diagnostics = getIngestSecretDiagnostics();

  return NextResponse.json({
    enabled: diagnostics.configured,
    diagnostics: {
      secretPresent: diagnostics.present,
      secretLooksLikeTemplate: diagnostics.looksLikeTemplate,
    },
    webhookUrl,
    method: "POST",
    auth: "Authorization: Bearer <ROUTE5_INGEST_SECRET> or X-Route5-Ingest-Secret: <same>",
    body: {
      projectId: "uuid — must exist in this workspace",
      text: "raw decision text (max 100k chars)",
      source: "optional: slack | email | meeting | manual",
    },
  });
}
