import { looksLikeTutorialOrEmptySecret } from "@/lib/env-template-guards";

export type IngestSecretDiagnostics = {
  configured: boolean;
  present: boolean;
  looksLikeTemplate: boolean;
};

/** Server-side diagnostics for ingest secret state (never returns secret contents). */
export function getIngestSecretDiagnostics(): IngestSecretDiagnostics {
  const raw = process.env.ROUTE5_INGEST_SECRET;
  const trimmed = raw?.trim() ?? "";
  const present = trimmed.length > 0;
  const looksLikeTemplate = present && looksLikeTutorialOrEmptySecret(trimmed);
  return {
    configured: present && !looksLikeTemplate,
    present,
    looksLikeTemplate,
  };
}

/** Server-only: shared secret for POST /api/ingest/webhook (Zapier, Slack outgoing, scripts). */
export function isIngestWebhookConfigured(): boolean {
  return getIngestSecretDiagnostics().configured;
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
