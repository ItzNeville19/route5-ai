import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  getFeaturesForTier,
  getLimitsForTier,
  isPaidTier,
  tierDisplayName,
  tierTaglineForTier,
  type EntitlementsPayload,
} from "@/lib/entitlements";
import { resolveEffectiveTierForUser } from "@/lib/entitlements-effective";
import {
  countExtractionsThisUtcMonthForUser,
  getWorkspaceSummaryForUser,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

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
  const limits = getLimitsForTier(tier);
  const features = getFeaturesForTier(tier);

  let projectCount = 0;
  let extractionCount = 0;
  try {
    const s = await getWorkspaceSummaryForUser(userId);
    projectCount = s.projectCount;
    extractionCount = s.extractionCount;
  } catch {
    /* ignore */
  }
  let extractionsThisMonth = 0;
  try {
    extractionsThisMonth = await countExtractionsThisUtcMonthForUser(userId);
  } catch {
    /* ignore */
  }

  const payload: EntitlementsPayload = {
    tier,
    tierLabel: tierDisplayName(tier),
    tierTagline: tierTaglineForTier(tier),
    isPaidTier: isPaidTier(tier),
    features,
    limits: {
      maxProjects: limits.maxProjects,
      maxExtractionsPerMonth: limits.maxExtractionsPerMonth,
    },
    usage: { projectCount, extractionCount, extractionsThisMonth },
  };

  return NextResponse.json(payload);
}
