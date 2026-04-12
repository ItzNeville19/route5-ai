import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
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
    extractionProviderId: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
    llmProviderId: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
    uiLocale: z
      .string()
      .refine((s): s is UiLocaleCode => isUiLocaleCode(s))
      .optional(),
    surfaceMaterial: z.enum(["liquid", "standard", "flat"]).optional(),
  })
  .strict();

const prefsBodySchema = z.object({ prefs: prefsPatchSchema }).strict();

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    const prefs = isPlainPrefs(raw) ? raw : {};
    return NextResponse.json({ prefs });
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
    return NextResponse.json({ ok: true, prefs: merged });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
