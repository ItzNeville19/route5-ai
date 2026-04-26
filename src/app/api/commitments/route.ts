import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";
import {
  createCommitment as createCanonicalCommitment,
  fetchCommitments as fetchCanonicalCommitments,
  type CommitmentStatus,
} from "@/lib/commitments/repository";
import { requireOrgRole } from "@/lib/workspace/org-members";

export const runtime = "nodejs";

const postSchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    owner: z.string().max(200).optional().nullable(),
    due_date: z.string().max(64).optional().nullable(),
    project_id: z.string().uuid(),
    status: z
      .enum(["pending", "accepted", "in_progress", "blocked", "done", "reopened"])
      .optional(),
    source: z.enum(["meeting", "email", "slack", "manual"]).optional(),
  })
  .strict();

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:list", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("project_id") ?? undefined;
  const statusRaw = url.searchParams.get("status");
  const status: CommitmentStatus | "active" | undefined =
    statusRaw === "pending" ||
    statusRaw === "accepted" ||
    statusRaw === "in_progress" ||
    statusRaw === "blocked" ||
    statusRaw === "done" ||
    statusRaw === "reopened"
      ? statusRaw
      : statusRaw === "active"
        ? "active"
        : undefined;

  try {
    const commitments = await fetchCanonicalCommitments(userId, {
      projectId,
      status,
    });
    return NextResponse.json({ commitments });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const orgAccess = await requireOrgRole(userId, ["admin", "manager"]);
  if (!orgAccess.ok) {
    return NextResponse.json({ error: "Only admins or managers can create commitments." }, { status: 403 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:post", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, postSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const body = parsed.data;
    if (!body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (body.due_date) {
      const due = new Date(body.due_date).getTime();
      if (!Number.isFinite(due)) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
    }
    const row = await createCanonicalCommitment(userId, {
      projectId: body.project_id,
      title: body.title,
      description: body.description ?? null,
      owner: body.owner ?? null,
      dueDate: body.due_date ?? null,
      status: body.status ?? "pending",
      source: body.source ?? "manual",
    });
    return NextResponse.json({ commitment: row });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
