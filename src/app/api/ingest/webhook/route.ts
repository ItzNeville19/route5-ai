import { NextResponse } from "next/server";
import { z } from "zod";
import { extractCommitments } from "@/lib/extract-commitments";
import { verifyIngestWebhookRequest } from "@/lib/ingest-secret";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  getClientIp,
  parseJsonBody,
} from "@/lib/security/request-guards";
import {
  getProjectOwnerClerkId,
  insertCommitmentsFromDrafts,
  reconcileCommitmentStatesForUser,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    projectId: z.string().uuid(),
    text: z.string().min(1).max(100_000),
    /** Optional hint for commitment source (stored on drafts where applicable). */
    source: z.enum(["slack", "email", "meeting", "manual"]).optional(),
  })
  .strict();

/**
 * Automation ingest: Zapier, Make, Slack outgoing webhooks, curl — no Clerk session.
 * Requires `Authorization: Bearer <ROUTE5_INGEST_SECRET>` or `X-Route5-Ingest-Secret`.
 */
export async function POST(req: Request) {
  if (!verifyIngestWebhookRequest(req)) {
    if (!process.env.ROUTE5_INGEST_SECRET?.trim()) {
      return NextResponse.json(
        { error: "Ingest webhook is not configured (set ROUTE5_INGEST_SECRET)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateLimited = enforceRateLimits(req, [
    { key: `ingest:webhook:ip:${ip}`, limit: 40, windowMs: 60_000 },
  ]);
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { projectId, text, source } = parsed.data;

  try {
    const ownerUserId = await getProjectOwnerClerkId(projectId);
    if (!ownerUserId) {
      return NextResponse.json({ error: "Unknown project id" }, { status: 404 });
    }

    let drafts = extractCommitments(text);
    if (source && drafts.length > 0) {
      drafts = drafts.map((d) => ({ ...d, source }));
    }

    const commitments = await insertCommitmentsFromDrafts(ownerUserId, projectId, drafts, {
      createdLogBody: "Ingested via automation webhook",
    });

    await reconcileCommitmentStatesForUser(ownerUserId);

    return NextResponse.json({
      ok: true,
      projectId,
      commitmentCount: commitments.length,
      commitmentIds: commitments.map((c) => c.id),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
