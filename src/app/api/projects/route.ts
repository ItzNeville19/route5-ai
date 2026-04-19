import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getLimitsForTier } from "@/lib/entitlements";
import { resolveEffectiveTierForUser } from "@/lib/entitlements-effective";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { planDisplayName, recommendedPlanAfterLimit } from "@/lib/billing/plans";
import { resolveEffectiveBillingPlan } from "@/lib/billing/resolve-plan";
import {
  createProjectForUser,
  listProjectsForUser,
  restoreProjectsFromBackupForUser,
} from "@/lib/workspace/store";
import {
  loadProjectBackupForUser,
  saveProjectBackupForUser,
} from "@/lib/workspace/project-backup";
import {
  enforceRateLimits,
  iconEmojiSchema,
  parseJsonBody,
  projectNameSchema,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Durable storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before loading projects.",
      },
      { status: 503 }
    );
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
    let projects = await listProjectsForUser(userId);
    if (projects.length === 0 && process.env.NODE_ENV !== "production") {
      // Local/dev recovery only — production must reflect Supabase state exactly.
      const backup = await loadProjectBackupForUser(userId);
      if (backup.length > 0) {
        projects = await restoreProjectsFromBackupForUser(userId, backup);
      }
    }
    await saveProjectBackupForUser(userId, projects);
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Durable storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel before creating projects.",
      },
      { status: 503 }
    );
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
    const tier = await resolveEffectiveTierForUser(userId, email);
    const { maxProjects } = getLimitsForTier(tier);
    const existing = await listProjectsForUser(userId);
    if (existing.length >= maxProjects) {
      const orgId = await ensureOrganizationForClerkUser(userId);
      const plan = await resolveEffectiveBillingPlan(orgId);
      return NextResponse.json(
        {
          error: "plan_limit",
          message: `Project limit reached (${maxProjects}) on ${planDisplayName(plan)}. Upgrade to create more projects.`,
          code: "LIMIT_PROJECTS",
          upgrade: {
            currentPlan: plan,
            limitHit: "projects" as const,
            recommendedPlan: recommendedPlanAfterLimit(plan, "projects"),
            message: `You’ve reached the project limit (${maxProjects}) for ${planDisplayName(plan)}. Upgrade to create more projects.`,
          },
        },
        { status: 409 }
      );
    }

    const icon =
      parsed.data.iconEmoji && parsed.data.iconEmoji.trim()
        ? parsed.data.iconEmoji
        : null;
    const project = await createProjectForUser(userId, parsed.data.name, {
      iconEmoji: icon,
    });
    const latest = await listProjectsForUser(userId);
    await saveProjectBackupForUser(userId, latest);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
