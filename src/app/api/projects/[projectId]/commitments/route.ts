import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  createCommitment,
  fetchCommitments,
} from "@/lib/commitments/repository";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const postSchema = z
  .object({
    title: z.string().min(1).max(2000),
    description: z.string().max(20_000).optional().nullable(),
    owner: z.string().max(200).optional().nullable(),
    dueDate: z.string().max(64).optional().nullable(),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
  })
  .strict();

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:list", userId, { userLimit: 120, ipLimit: 240 })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  try {
    const commitments = await fetchCommitments(userId, { projectId });
    return NextResponse.json({ commitments });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "commitments:post", userId, {
      userLimit: 60,
      ipLimit: 120,
      userWindowMs: 60_000,
      ipWindowMs: 60_000,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(req, postSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await createCommitment(userId, {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      owner: parsed.data.owner ?? null,
      dueDate: parsed.data.dueDate ?? null,
      status: parsed.data.status ?? "pending",
    });
    return NextResponse.json({ commitment: row });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
