import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import { mergeWorkspacePrefsPatch } from "@/lib/workspace-prefs";
import {
  fetchWorkspacePrefsFromSupabase,
  upsertWorkspacePrefsSupabase,
} from "@/lib/workspace/prefs-supabase-server";
import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { isUiLocaleCode } from "@/lib/i18n/ui-locales";
import { WORKSPACE_THEME_IDS } from "@/lib/workspace-themes";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  shortcutSchema,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const META_KEY = "route5WorkspacePrefs" as const;

function isPlainPrefs(x: unknown): x is WorkspacePrefsV1 {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

const workspaceHeroPhotoSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("preset"),
    path: z.string().transform(cleanText).pipe(z.string().max(200)),
  }),
  z.object({
    kind: z.literal("upload"),
    dataUrl: z.string().max(480000),
  }),
]);

const prefsPatchSchema = z
  .object({
    compact: z.boolean().optional(),
    focusMode: z.boolean().optional(),
    pinnedProjectIds: z.array(z.string().transform(cleanText).pipe(z.string().max(120))).max(100).optional(),
    marketplaceFavorites: z.array(z.string().transform(cleanText).pipe(z.string().max(120))).max(200).optional(),
    installedMarketplaceAppIds: z.array(z.string().transform(cleanText).pipe(z.string().max(120))).max(200).optional(),
    dashboardCompanyNote: z.string().transform(cleanText).pipe(z.string().max(2000)).optional(),
    dashboardAiShortcuts: z.array(shortcutSchema).max(6).optional(),
    workspaceTimezone: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
    workspaceRegionKey: z.string().transform(cleanText).pipe(z.string().max(64)).optional(),
    appearanceGradients: z.boolean().optional(),
    workspaceCanvasBackground: z.enum(["gradient", "photo"]).optional(),
    appearanceTheme: z
      .string()
      .refine(
        (s): s is (typeof WORKSPACE_THEME_IDS)[number] =>
          (WORKSPACE_THEME_IDS as readonly string[]).includes(s)
      )
      .optional(),
    appearanceSchedule: z.enum(["auto", "day", "night"]).optional(),
    commandCenterMode: z.enum(["auto", "on", "off"]).optional(),
    sidebarHidden: z.boolean().optional(),
    onboardingChecklistDismissed: z.boolean().optional(),
    companyPresetId: z.enum(["startup", "enterprise", "agency", "consulting", "custom"]).optional(),
    extractionProviderId: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
    llmProviderId: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
    uiLocale: z
      .string()
      .refine((s): s is UiLocaleCode => isUiLocaleCode(s))
      .optional(),
    surfaceMaterial: z.enum(["liquid", "standard", "flat"]).optional(),
    commandCenterDensity: z.enum(["compact", "comfortable"]).optional(),
    welcomeHeroStyle: z.enum(["atmospheric", "minimal", "glass"]).optional(),
    accentIntensity: z.enum(["subtle", "medium", "strong"]).optional(),
    welcomeHeroPalette: z.number().int().min(0).max(31).optional(),
    defaultWorkspaceView: z.enum(["admin", "employee"]).optional(),
    pinnedCommandActions: z.array(z.string().transform(cleanText).pipe(z.string().max(64))).max(12).optional(),
    dashboardSectionOrder: z.array(z.string().transform(cleanText).pipe(z.string().max(32))).max(12).optional(),
    heroLocationOverride: z.string().transform(cleanText).pipe(z.string().max(120)).optional(),
    guidedTourCompleted: z.boolean().optional(),
    agentDueReminderEmailsEnabled: z.boolean().optional(),
    workspaceHeroPhotoSource: workspaceHeroPhotoSourceSchema.optional(),
  })
  .strict();

const prefsBodySchema = z.object({ prefs: prefsPatchSchema }).strict();

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "prefs:get", userId, {
      userLimit: 90,
      ipLimit: 180,
    })
  );
  if (rateLimited) return rateLimited;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
    const clerkPrefs = isPlainPrefs(raw) ? raw : {};
    const sbPartial = await fetchWorkspacePrefsFromSupabase(userId);
    const prefs =
      sbPartial && Object.keys(sbPartial).length > 0
        ? mergeWorkspacePrefsPatch(clerkPrefs, sbPartial)
        : clerkPrefs;
    return NextResponse.json({ prefs });
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

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "prefs:post", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, prefsBodySchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data.prefs;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existing = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
    const base = isPlainPrefs(existing) ? existing : {};
    const merged: WorkspacePrefsV1 = { ...base, ...patch };
    await client.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        [META_KEY]: merged,
      },
    });
    await upsertWorkspacePrefsSupabase(userId, merged);
    return NextResponse.json({ ok: true, prefs: merged });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
