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

const sourceSchema = z.enum(["slack", "email", "meeting", "manual"]);

const jsonBodySchema = z
  .object({
    projectId: z.string().uuid().optional(),
    text: z.string().min(1).max(100_000),
    source: sourceSchema.optional(),
  })
  .strict();

function normalizeText(raw: string): string {
  return raw.replace(/\u0000/g, "").trim();
}

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

  let projectId = new URL(req.url).searchParams.get("projectId")?.trim() ?? "";
  let text = "";
  let source: z.infer<typeof sourceSchema> | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = await parseJsonBody(req, jsonBodySchema);
    if (!parsed.ok) return parsed.response;
    projectId = parsed.data.projectId ?? projectId;
    text = parsed.data.text;
    source = parsed.data.source;
  } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const txt = form.get("text");
    const pid = form.get("projectId");
    const src = form.get("source");
    if (typeof txt !== "string" || !txt.trim()) {
      return NextResponse.json({ error: "Field 'text' is required." }, { status: 400 });
    }
    if (typeof pid === "string" && pid.trim()) projectId = pid.trim();
    if (typeof src === "string" && sourceSchema.safeParse(src).success) source = src as z.infer<typeof sourceSchema>;
    text = txt;
  } else {
    text = await req.text();
  }

  text = normalizeText(text);
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required (body or query)." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Text body is empty." }, { status: 400 });
  }

  try {
    const ownerUserId = await getProjectOwnerClerkId(projectId);
    if (!ownerUserId) {
      return NextResponse.json({ error: "Unknown project id" }, { status: 404 });
    }

    let drafts = extractCommitments(text.slice(0, 100_000));
    if (source && drafts.length > 0) {
      drafts = drafts.map((d) => ({ ...d, source }));
    }

    const highConfidence = drafts.filter((d) => d.confidence === "high");
    const queuedForReview = drafts.filter((d) => d.confidence !== "high");

    const commitments = await insertCommitmentsFromDrafts(ownerUserId, projectId, highConfidence, {
      createdLogBody: "Ingested via automation webhook",
    });

    await reconcileCommitmentStatesForUser(ownerUserId);

    return NextResponse.json({
      captured: commitments.length,
      queued_for_review: queuedForReview.length,
      commitments: commitments.map((c) => ({
        id: c.id,
        title: c.title,
        ownerUserId: c.ownerUserId ?? null,
        dueDate: c.dueDate ?? null,
        priority: c.priority,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
