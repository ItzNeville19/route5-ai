import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { getLimitsForTier, resolveTierForUser } from "@/lib/entitlements";
import {
  createProjectForUser,
  listProjectsForUser,
} from "@/lib/workspace/store";
import {
  enforceRateLimits,
  iconEmojiSchema,
  parseJsonBody,
  projectNameSchema,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "projects:get", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const projects = await listProjectsForUser(userId);
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "projects:post", userId, {
      userLimit: 20,
      ipLimit: 40,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(
    req,
    z
      .object({
        name: projectNameSchema,
        iconEmoji: iconEmojiSchema.optional(),
      })
      .strict()
  );
  if (!parsed.ok) return parsed.response;

  try {
    let email: string | undefined;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        undefined;
    } catch {
      email = undefined;
    }
    const tier = resolveTierForUser(userId, email);
    const { maxProjects } = getLimitsForTier(tier);
    const existing = await listProjectsForUser(userId);
    if (existing.length >= maxProjects) {
      return NextResponse.json(
        {
          error: `Project limit reached (${maxProjects}) for your plan. Upgrade or remove a project.`,
          code: "LIMIT_PROJECTS",
        },
        { status: 403 }
      );
    }

    const icon =
      parsed.data.iconEmoji && parsed.data.iconEmoji.trim()
        ? parsed.data.iconEmoji
        : null;
    const project = await createProjectForUser(userId, parsed.data.name, {
      iconEmoji: icon,
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
