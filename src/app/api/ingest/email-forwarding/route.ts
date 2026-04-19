import { NextResponse } from "next/server";
import { z } from "zod";
import { extractCommitments } from "@/lib/extract-commitments";
import { verifyIngestWebhookRequest } from "@/lib/ingest-secret";
import { sendOperationalEmail } from "@/lib/notify-resend";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  getClientIp,
  parseJsonBody,
} from "@/lib/security/request-guards";
import { parseForwardingAddressToOrgId } from "@/lib/workspace/email-forwarding";
import {
  insertCommitmentsFromDrafts,
  listProjectsForUser,
  reconcileCommitmentStatesForUser,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    to: z.string().email().optional(),
    from: z.string().email().optional(),
    subject: z.string().max(500).optional(),
    text: z.string().min(1).max(100_000),
    projectId: z.string().uuid().optional(),
  })
  .strict();

function normalizeText(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function summarizeCapturedTitles(titles: string[]): string {
  if (titles.length === 0) return "No commitments were captured.";
  const lines = titles.slice(0, 6).map((t, i) => `${i + 1}. ${t}`);
  const extra = titles.length > 6 ? `\n...and ${titles.length - 6} more.` : "";
  return `${lines.join("\n")}${extra}`;
}

async function resolveTargetFromInput(input: {
  to?: string;
  projectId?: string;
}): Promise<{ orgId: string; ownerUserId: string; projectId: string } | null> {
  const orgId = input.to ? parseForwardingAddressToOrgId(input.to) : null;
  if (!orgId) return null;

  const ownerUserId = await getOrganizationClerkUserId(orgId);
  if (!ownerUserId) return null;

  if (input.projectId) {
    return { orgId, ownerUserId, projectId: input.projectId };
  }

  const projects = await listProjectsForUser(ownerUserId);
  if (!projects[0]) return null;
  return { orgId, ownerUserId, projectId: projects[0].id };
}

/**
 * Inbound email forwarding endpoint.
 * Mail provider should POST with ROUTE5_INGEST_SECRET auth, include `to` and `text`.
 */
export async function POST(req: Request) {
  if (!verifyIngestWebhookRequest(req)) {
    if (!process.env.ROUTE5_INGEST_SECRET?.trim()) {
      return NextResponse.json(
        { error: "Email forwarding is not configured (set ROUTE5_INGEST_SECRET)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateLimited = enforceRateLimits(req, [
    { key: `ingest:email-forwarding:ip:${ip}`, limit: 40, windowMs: 60_000 },
  ]);
  if (rateLimited) return rateLimited;

  const contentType = req.headers.get("content-type") ?? "";
  let to = new URL(req.url).searchParams.get("to")?.trim();
  let from = new URL(req.url).searchParams.get("from")?.trim();
  let text = "";
  let subject = new URL(req.url).searchParams.get("subject")?.trim();
  let projectId = new URL(req.url).searchParams.get("projectId")?.trim();

  if (contentType.includes("application/json")) {
    const parsed = await parseJsonBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;
    to = parsed.data.to ?? to;
    from = parsed.data.from ?? from;
    text = parsed.data.text;
    subject = parsed.data.subject ?? subject;
    projectId = parsed.data.projectId ?? projectId;
  } else if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const textField = form.get("text");
    const bodyField = form.get("body");
    const htmlField = form.get("html");
    const toField = form.get("to");
    const fromField = form.get("from");
    const subjectField = form.get("subject");
    const projectField = form.get("projectId");

    const firstText =
      (typeof textField === "string" && textField) ||
      (typeof bodyField === "string" && bodyField) ||
      (typeof htmlField === "string" && htmlField) ||
      "";
    text = firstText;
    if (typeof toField === "string" && toField.trim()) to = toField.trim();
    if (typeof fromField === "string" && fromField.trim()) from = fromField.trim();
    if (typeof subjectField === "string" && subjectField.trim()) subject = subjectField.trim();
    if (typeof projectField === "string" && projectField.trim()) projectId = projectField.trim();
  } else {
    text = await req.text();
  }

  text = normalizeText(text);
  if (!to) {
    return NextResponse.json({ error: "Missing forwarding address in `to`." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Email text body is empty." }, { status: 400 });
  }

  try {
    const target = await resolveTargetFromInput({ to, projectId });
    if (!target) {
      return NextResponse.json(
        { error: "Could not resolve org/project for forwarding address." },
        { status: 404 }
      );
    }

    const drafts = extractCommitments(text.slice(0, 100_000)).map((d) => ({
      ...d,
      source: "email" as const,
    }));
    const highConfidence = drafts.filter((d) => d.confidence === "high");
    const queuedForReview = drafts.filter((d) => d.confidence !== "high");
    const created = await insertCommitmentsFromDrafts(
      target.ownerUserId,
      target.projectId,
      highConfidence,
      {
        createdLogBody: subject
          ? `Captured from forwarded email: ${subject.slice(0, 120)}`
          : "Captured from forwarded email",
      }
    );

    await reconcileCommitmentStatesForUser(target.ownerUserId);

    const reply = `Captured ${created.length} commitment${created.length === 1 ? "" : "s"} from your email.`;
    if (from) {
      void sendOperationalEmail({
        to: from,
        subject: `Route5: ${reply}`,
        text: `${reply}\n\n${summarizeCapturedTitles(created.map((c) => c.title))}`,
      }).catch(() => {
        /* optional ack email */
      });
    }

    return NextResponse.json({
      captured: created.length,
      queued_for_review: queuedForReview.length,
      reply,
      commitments: created.map((c) => ({
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
