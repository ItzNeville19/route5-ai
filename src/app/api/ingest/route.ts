import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isIngestWebhookConfigured } from "@/lib/ingest-secret";

export const runtime = "nodejs";

/**
 * Signed-in users: whether automation ingest is enabled and the webhook URL (no secret exposed).
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const webhookUrl = `${url.origin}/api/ingest/webhook`;

  return NextResponse.json({
    enabled: isIngestWebhookConfigured(),
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
