import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { Commitment } from "@/lib/commitment-types";
import type { ExtractedCommitmentDraft } from "@/lib/extract-commitments";
import { extractCommitments } from "@/lib/extract-commitments";
import { processCaptureText } from "@/lib/capture/process-capture-text";
import { notifyProjectDeskAssignment } from "@/lib/org-commitments/notify-assignment";
import { sendNotification } from "@/lib/notifications/service";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  insertCommitmentsFromDrafts,
  listCommitmentsForProject,
  verifyProjectOwned,
} from "@/lib/workspace/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { createOrgCommitment } from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import {
  cleanText,
  enforceRateLimits,
  isWorkspaceResourceId,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const sourceSchema = z.enum(["meeting", "slack", "email", "manual"]);
const prioritySchema = z.enum(["low", "medium", "high"]);

const commitDraftSchema = z
  .object({
    title: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1).max(2000)),
    description: z.string().max(20_000).optional().nullable(),
    ownerName: z.string().max(200).optional().nullable(),
    ownerUserId: z.string().max(128).optional().nullable(),
    source: sourceSchema.optional(),
    sourceReference: z.string().max(2000).optional(),
    priority: prioritySchema.optional(),
    dueDate: z.string().max(48).optional().nullable(),
  })
  .strict();

const postBodySchema = z
  .object({
    extractFrom: z.string().transform(cleanText).pipe(z.string().min(1).max(100_000)).optional(),
    /** When true with extractFrom, returns proposed drafts only — nothing is persisted. */
    preview: z.boolean().optional(),
    assignOwnerUserId: z.string().min(1).max(128).optional().nullable(),
    manual: z
      .object({
        title: z.string().min(1).max(2000),
        description: z.string().max(20_000).optional().nullable(),
        source: sourceSchema.optional(),
        sourceReference: z.string().max(2000).optional(),
        priority: prioritySchema.optional(),
        dueDate: z.string().max(48).optional().nullable(),
        ownerUserId: z.string().max(128).optional().nullable(),
        ownerDisplayName: z.string().max(200).optional().nullable(),
      })
      .strict()
      .optional(),
    commitDrafts: z.array(commitDraftSchema).min(1).max(40).optional(),
  })
  .strict();

function cleanDraftTitle(raw: string): string {
  return raw
    .replace(/[*_`#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSectionHeaderTitle(title: string): boolean {
  const t = title.trim().toLowerCase().replace(/[:\s]+$/g, "");
  if (!t) return true;
  return (
    t === "kpis" ||
    t === "tasks" ||
    t === "notes" ||
    t === "risk" ||
    t === "status" ||
    t === "owner" ||
    t === "due date"
  );
}

function dedupeAndCapDrafts(drafts: ExtractedCommitmentDraft[], max = 12): ExtractedCommitmentDraft[] {
  const seen = new Set<string>();
  const out: ExtractedCommitmentDraft[] = [];
  for (const row of drafts) {
    const title = cleanDraftTitle(row.title ?? "");
    if (!title || title.length < 6) continue;
    if (isSectionHeaderTitle(title)) continue;
    if (/^(?:task|tasks?)[:\s-]*$/i.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...row, title });
    if (out.length >= max) break;
  }
  return out;
}

function resolveDeadlineIsoFromDueDate(raw: string | null | undefined): string {
  if (!raw) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  const dayOnly = new Date(`${raw}T17:00:00.000Z`);
  if (!Number.isNaN(dayOnly.getTime())) {
    return dayOnly.toISOString();
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function filterCommitments(
  list: Commitment[],
  filter: string,
  clerkUserId: string
): Commitment[] {
  const notDone = (c: (typeof list)[number]) => c.status !== "completed";

  switch (filter) {
    case "my":
      return list.filter((c) => c.ownerUserId === clerkUserId && notDone(c));
    case "at_risk":
      return list.filter((c) => c.status === "at_risk");
    case "overdue":
      return list.filter((c) => c.status === "overdue");
    case "unassigned":
      return list.filter(
        (c) =>
          !c.ownerUserId &&
          !c.ownerDisplayName?.trim() &&
          notDone(c)
      );
    case "history":
      return list.filter((c) => c.status === "completed");
    case "open":
    case "all":
      return list.filter(notDone);
    default:
      return list.filter(notDone);
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:list", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const rawFilter = url.searchParams.get("filter") ?? "open";
  const filter = rawFilter === "all" ? "open" : rawFilter;

  try {
    const list = await listCommitmentsForProject(userId, projectId);
    const commitments = filterCommitments(list, filter, userId);
    return NextResponse.json({ commitments });
  } catch (e) {
    const payload: { error: string; debug?: { message: string; name: string } } = {
      error: publicWorkspaceError(e),
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error) {
      payload.debug = { message: e.message, name: e.name };
    }
    return NextResponse.json(payload, { status: 503 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:post", userId, {
      userLimit: 30,
      ipLimit: 60,
      userWindowMs: 60_000,
      ipWindowMs: 60_000,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(req, postBodySchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  if (!body.extractFrom && !body.manual && !body.commitDrafts?.length) {
    return NextResponse.json(
      { error: "Provide extractFrom (with preview), commitDrafts, or manual" },
      { status: 400 }
    );
  }

  try {
    const owned = await verifyProjectOwned(userId, projectId);
    if (!owned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.preview === true) {
      if (!body.extractFrom) {
        return NextResponse.json(
          { error: "preview requires extractFrom" },
          { status: 400 }
        );
      }
      const ai = await processCaptureText(body.extractFrom, undefined, { userId });
      const aiDrafts: ExtractedCommitmentDraft[] = ai.commitments.map((c) => ({
        title: c.title,
        description: null,
        ownerName: c.ownerName ?? null,
        ownerUserId: c.ownerUserId ?? null,
        source: c.source,
        sourceReference: `capture:${nanoid(10)}`,
        priority: c.priority === "high" || c.priority === "low" ? c.priority : "medium",
        dueDate: c.dueDateIso ?? null,
        sourceSnippet: c.sourceSnippet ?? c.title,
        dueDatePhrase: c.deadlineOriginalPhrase ?? null,
        confidence: c.confidence,
        isImplied: c.isImplied,
        impliedReason: c.impliedReason,
      }));
      const offlineDrafts = extractCommitments(body.extractFrom);
      const structuredBlock = /(^|\n)\s*commitment:\s*/i.test(body.extractFrom) && /(^|\n)\s*tasks:\s*/i.test(body.extractFrom);
      const drafts = dedupeAndCapDrafts([...offlineDrafts, ...aiDrafts], structuredBlock ? 3 : 12);
      return NextResponse.json({ drafts, mode: ai.mode, error: ai.error });
    }

    if (body.commitDrafts?.length) {
      const drafts: ExtractedCommitmentDraft[] = body.commitDrafts.map((d) => ({
        title: d.title,
        description: d.description ?? null,
        ownerName: d.ownerName?.trim() || null,
        ownerUserId: d.ownerUserId?.trim() || null,
        source: d.source ?? "meeting",
        sourceReference: d.sourceReference?.trim() || `desk:${nanoid(10)}`,
        priority: d.priority ?? "medium",
        dueDate: d.dueDate?.trim() || null,
      }));
      const commitments = await insertCommitmentsFromDrafts(userId, projectId, drafts, {
        createdLogBody: "Committed from Desk",
      });
      const orgId = await ensureOrganizationForClerkUser(userId);
      for (const c of commitments) {
        const deadline = resolveDeadlineIsoFromDueDate(c.dueDate);
        const row = await createOrgCommitment(userId, {
          title: c.title,
          description: c.description,
          ownerId: c.ownerUserId ?? userId,
          projectId,
          deadline,
          priority: c.priority === "high" ? "high" : c.priority === "low" ? "low" : "medium",
        });
        broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
      }
      const byOwner = new Map<string, Commitment[]>();
      for (const c of commitments) {
        if (!c.ownerUserId || c.ownerUserId === userId) continue;
        const list = byOwner.get(c.ownerUserId) ?? [];
        list.push(c);
        byOwner.set(c.ownerUserId, list);
      }
      await Promise.all(
        [...byOwner.entries()].map(async ([ownerClerkId, rows]) => {
          if (rows.length === 1) {
            const one = rows[0]!;
            return notifyProjectDeskAssignment({
              orgId,
              ownerClerkId,
              title: one.title,
              projectId,
              commitmentId: one.id,
              dueLabel: one.dueDate ? one.dueDate.slice(0, 16).replace("T", " ") : "Not set",
              priority: one.priority,
            });
          }
          const link = `/desk?projectId=${encodeURIComponent(projectId)}`;
          await sendNotification({
            orgId,
            userId: ownerClerkId,
            type: "commitment_assigned",
            title: `${rows.length} commitments assigned`,
            body: `You were assigned ${rows.length} commitments in one batch. Open Desk to review due dates and priorities.`,
            metadata: {
              projectId,
              commitmentCount: rows.length,
              commitmentIds: rows.map((r) => r.id),
              link,
            },
          });
        })
      );
      return NextResponse.json({ commitments });
    }

    if (body.extractFrom) {
      return NextResponse.json(
        {
          error:
            "To capture from text, call with preview: true to review proposals, then commit with commitDrafts.",
        },
        { status: 400 }
      );
    }

    const m = body.manual!;
    const commitments = await insertCommitmentsFromDrafts(
      userId,
      projectId,
      [
        {
          title: m.title,
          description: m.description ?? null,
          ownerName: m.ownerDisplayName ?? null,
          source: m.source ?? "manual",
          sourceReference: m.sourceReference ?? "manual",
          priority: m.priority ?? "medium",
          dueDate: m.dueDate ?? null,
        },
      ],
      { assignOwnerUserId: m.ownerUserId ?? undefined }
    );
    const orgId = await ensureOrganizationForClerkUser(userId);
    for (const c of commitments) {
      const deadline = resolveDeadlineIsoFromDueDate(c.dueDate);
      const row = await createOrgCommitment(userId, {
        title: c.title,
        description: c.description,
        ownerId: c.ownerUserId ?? userId,
        projectId,
        deadline,
        priority: c.priority === "high" ? "high" : c.priority === "low" ? "low" : "medium",
      });
      broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
    }
    return NextResponse.json({ commitments });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const payload: { error: string; debug?: { message: string; name: string } } = {
      error: publicWorkspaceError(e),
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error) {
      payload.debug = { message: e.message, name: e.name };
    }
    return NextResponse.json(payload, { status: 503 });
  }
}
