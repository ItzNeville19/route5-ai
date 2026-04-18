import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { Commitment } from "@/lib/commitment-types";
import type { ExtractedCommitmentDraft } from "@/lib/extract-commitments";
import { extractCommitments } from "@/lib/extract-commitments";
import { notifyProjectDeskAssignment } from "@/lib/org-commitments/notify-assignment";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  insertCommitmentsFromDrafts,
  listCommitmentsForProject,
  verifyProjectOwned,
} from "@/lib/workspace/store";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
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

function filterCommitments(
  list: Commitment[],
  filter: string,
  clerkUserId: string
): Commitment[] {
  switch (filter) {
    case "my":
      return list.filter((c) => c.ownerUserId === clerkUserId);
    case "at_risk":
      return list.filter((c) => c.status === "at_risk");
    case "overdue":
      return list.filter((c) => c.status === "overdue");
    case "unassigned":
      return list.filter((c) => !c.ownerUserId && !c.ownerDisplayName?.trim());
    default:
      return list;
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  const filter = url.searchParams.get("filter") ?? "all";

  try {
    const list = await listCommitmentsForProject(userId, projectId);
    const commitments = filterCommitments(list, filter, userId);
    return NextResponse.json({ commitments });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
      const drafts = extractCommitments(body.extractFrom);
      return NextResponse.json({ drafts });
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
      await Promise.all(
        commitments
          .filter((c) => c.ownerUserId && c.ownerUserId !== userId)
          .map((c) =>
            notifyProjectDeskAssignment({
              orgId,
              ownerClerkId: c.ownerUserId!,
              title: c.title,
              projectId,
              commitmentId: c.id,
              dueLabel: c.dueDate ? c.dueDate.slice(0, 10) : "Not set",
              priority: c.priority,
            })
          )
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
    return NextResponse.json({ commitments });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
