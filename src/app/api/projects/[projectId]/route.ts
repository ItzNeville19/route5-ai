import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  deleteProjectForUser,
  getProjectDetailForUser,
  updateProjectForUser,
} from "@/lib/workspace/store";
import {
  enforceRateLimits,
  iconEmojiSchema,
  isWorkspaceResourceId,
  parseJsonBody,
  projectNameSchema,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const projectPatchSchema = z
  .object({
    name: projectNameSchema.optional(),
    iconEmoji: z.union([iconEmojiSchema, z.null()]).optional(),
  })
  .strict();

const deleteProjectBodySchema = z
  .object({
    confirmationPhrase: z.string().min(1).max(64),
    password: z.string().max(512).optional(),
  })
  .strict();

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
    userAndIpRateScopes(req, "project:get", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  try {
    const detail = await getProjectDetailForUser(userId, projectId);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      project: detail.project,
      extractions: detail.extractions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "project:patch", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }
  const parsed = await parseJsonBody(req, projectPatchSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;

  if (patch.name === undefined && patch.iconEmoji === undefined) {
    return NextResponse.json(
      { error: "Provide name and/or iconEmoji" },
      { status: 400 }
    );
  }

  try {
    const project = await updateProjectForUser(userId, projectId, patch);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_NAME") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "project:delete", userId, {
      userLimit: 15,
      ipLimit: 30,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, deleteProjectBodySchema);
  if (!parsed.ok) return parsed.response;

  const phrase = parsed.data.confirmationPhrase.trim().toLowerCase();
  if (phrase !== "delete") {
    return NextResponse.json(
      { error: 'Type the word "delete" to confirm.' },
      { status: 400 }
    );
  }

  const { projectId } = await ctx.params;
  if (!isWorkspaceResourceId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user.passwordEnabled) {
      const pwd = parsed.data.password?.trim() ?? "";
      if (!pwd) {
        return NextResponse.json(
          { error: "Enter your account password to confirm deletion." },
          { status: 400 }
        );
      }
      try {
        await client.users.verifyPassword({ userId, password: pwd });
      } catch {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 401 }
        );
      }
    }

    const removed = await deleteProjectForUser(userId, projectId);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
