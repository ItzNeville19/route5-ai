/**
 * Plan limits and tier resolution — enforced on the server for project creation and extractions.
 *
 * - `ROUTE5_ULTIMATE_EMAILS=comma@emails` → Enterprise limits for those sign-in emails.
 * - `ROUTE5_ULTIMATE_USER_IDS=user_abc,user_xyz` → Enterprise for those Clerk user IDs (best for founders).
 * - `ROUTE5_ENTITLEMENTS=email:tier,email2:tier` where tier is free | pro | ultra | enterprise
 */
import type { PlanTierId } from "@/lib/plans-catalog";

export type { PlanTierId };

export type TierLimits = {
  maxProjects: number;
  maxExtractionsPerMonth: number;
};

/** Numeric caps — enterprise uses a high ceiling in code; contracts may define actual limits. */
export const TIER_LIMITS: Record<PlanTierId, TierLimits> = {
  /** Tight on purpose — paid tiers unlock real headroom and connector features. */
  free: { maxProjects: 3, maxExtractionsPerMonth: 60 },
  pro: { maxProjects: 30, maxExtractionsPerMonth: 4000 },
  ultra: { maxProjects: 120, maxExtractionsPerMonth: 25000 },
  enterprise: { maxProjects: 999999, maxExtractionsPerMonth: 999999 },
};

const TIER_SET = new Set<PlanTierId>(["free", "pro", "ultra", "enterprise"]);

function isPlanTierId(s: string): s is PlanTierId {
  return TIER_SET.has(s as PlanTierId);
}

type EntitlementCache = {
  emailTier: Map<string, PlanTierId>;
  ultimateUserIds: Set<string>;
};

let cache: EntitlementCache | null = null;

function loadEntitlements(): EntitlementCache {
  if (cache) return cache;

  const emailTier = new Map<string, PlanTierId>();

  const raw = process.env.ROUTE5_ENTITLEMENTS?.trim();
  if (raw) {
    for (const part of raw.split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const colon = seg.indexOf(":");
      if (colon <= 0) continue;
      const email = seg.slice(0, colon).trim().toLowerCase();
      const tier = seg.slice(colon + 1).trim().toLowerCase();
      if (email && isPlanTierId(tier)) emailTier.set(email, tier);
    }
  }
  const ultimate = process.env.ROUTE5_ULTIMATE_EMAILS?.split(",") ?? [];
  for (const part of ultimate) {
    const email = part.trim().toLowerCase();
    if (email) emailTier.set(email, "enterprise");
  }

  const ultimateUserIds = new Set<string>();
  const uidRaw = process.env.ROUTE5_ULTIMATE_USER_IDS?.trim();
  if (uidRaw) {
    for (const part of uidRaw.split(",")) {
      const id = part.trim();
      if (id) ultimateUserIds.add(id);
    }
  }

  cache = { emailTier, ultimateUserIds };
  return cache;
}

/** Resolve tier for an email (server-side; uses env). Defaults to free. */
export function resolveTierForEmail(email: string | undefined | null): PlanTierId {
  if (!email?.trim()) return "free";
  const key = email.trim().toLowerCase();
  return loadEntitlements().emailTier.get(key) ?? "free";
}

/**
 * Prefer this in API routes: checks `ROUTE5_ULTIMATE_USER_IDS` first, then email maps.
 *
 * Local dev: set `ROUTE5_DEV_MAX_TIER=1` (only when `NODE_ENV === "development"`) to treat every
 * signed-in user as Enterprise — quick founder testing without touching production.
 */
export function resolveTierForUser(
  userId: string | null | undefined,
  email: string | undefined | null
): PlanTierId {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ROUTE5_DEV_MAX_TIER?.trim() === "1"
  ) {
    return "enterprise";
  }
  if (userId && loadEntitlements().ultimateUserIds.has(userId)) {
    return "enterprise";
  }
  return resolveTierForEmail(email);
}

export function getLimitsForTier(tier: PlanTierId): TierLimits {
  return TIER_LIMITS[tier];
}

/** Feature flags for UI and integration gates — derived from tier (no separate DB). */
export type TierFeatures = {
  /** Pro+ — Slack integration page and API are usable (org still configures tokens). */
  slackConnector: boolean;
  /** Pro+ — full analytics / exports positioning. */
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  /** Pro+ — Team insights shown as “full” (free still sees page with upgrade hints). */
  teamInsightsFull: boolean;
  exportFull: boolean;
  /** Ultra+ — reserved for future SSO / org controls messaging. */
  ssoRoadmap: boolean;
};

export function getFeaturesForTier(tier: PlanTierId): TierFeatures {
  switch (tier) {
    case "free":
      return {
        slackConnector: false,
        advancedAnalytics: false,
        prioritySupport: false,
        teamInsightsFull: false,
        exportFull: false,
        ssoRoadmap: false,
      };
    case "pro":
      return {
        slackConnector: true,
        advancedAnalytics: true,
        prioritySupport: true,
        teamInsightsFull: true,
        exportFull: true,
        ssoRoadmap: false,
      };
    case "ultra":
      return {
        slackConnector: true,
        advancedAnalytics: true,
        prioritySupport: true,
        teamInsightsFull: true,
        exportFull: true,
        ssoRoadmap: true,
      };
    case "enterprise":
      return {
        slackConnector: true,
        advancedAnalytics: true,
        prioritySupport: true,
        teamInsightsFull: true,
        exportFull: true,
        ssoRoadmap: true,
      };
    default:
      return getFeaturesForTier("free");
  }
}

export function isPaidTier(tier: PlanTierId): boolean {
  return tier !== "free";
}

export function tierTaglineForTier(tier: PlanTierId): string {
  switch (tier) {
    case "free":
      return "You’re on Free — tight limits so paid teams get priority capacity, Slack, and full exports.";
    case "pro":
      return "You’re on Pro — thanks for backing Route5. Slack connector, full exports, and priority support are included.";
    case "ultra":
      return "You’re on Ultra — higher limits; roadmap items (e.g. SSO) are confirmed in sales, not implied here.";
    case "enterprise":
      return "You’re on Enterprise — contract-level high caps; specifics are in your order or MSA.";
    default:
      return "";
  }
}

/** Client + API shape for `/api/workspace/entitlements`. */
export type EntitlementsPayload = {
  tier: PlanTierId;
  tierLabel: string;
  /** Short celebration / upgrade line for Settings and sidebars. */
  tierTagline: string;
  isPaidTier: boolean;
  features: TierFeatures;
  limits: { maxProjects: number; maxExtractionsPerMonth: number };
  usage: {
    projectCount: number;
    /** All-time extractions (workspace total). */
    extractionCount: number;
    /** Extractions created this UTC calendar month — enforced against plan cap. */
    extractionsThisMonth: number;
  };
};

export function tierDisplayName(tier: PlanTierId): string {
  switch (tier) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "ultra":
      return "Ultra";
    case "enterprise":
      return "Enterprise";
    default:
      return tier;
  }
}
