import { looksLikeTutorialOrEmptySecret } from "@/lib/env-template-guards";

/** Server-only: shared secret for POST /api/ingest/webhook (Zapier, Slack outgoing, scripts). */
export function isIngestWebhookConfigured(): boolean {
  const s = process.env.ROUTE5_INGEST_SECRET?.trim();
  return Boolean(s && !looksLikeTutorialOrEmptySecret(s));
}

export function verifyIngestWebhookRequest(req: Request): boolean {
  if (!isIngestWebhookConfigured()) return false;
  const secret = process.env.ROUTE5_INGEST_SECRET!.trim();
  const auth = req.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const header = req.headers.get("x-route5-ingest-secret")?.trim();
  return bearer === secret || header === secret;
}
