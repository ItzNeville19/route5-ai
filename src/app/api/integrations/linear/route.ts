import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isLinearConfigured,
  linearFetchIssueForImport,
  linearListRecentIssues,
} from "@/lib/linear-api";
import { PREVIEW_LINEAR_ISSUES, previewLinearImport } from "@/lib/integration-preview-data";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const linearImportSchema = z
  .object({
    ref: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(1, "Missing ref (URL or TEAM-123).").max(500)),
  })
  .strict();

/** List recent issues or connectivity when GET; import one issue body when POST. */
export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "linear:get", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  if (!isLinearConfigured()) {
    return NextResponse.json({
      configured: false,
      previewMode: true,
      issues: PREVIEW_LINEAR_ISSUES,
    });
  }

  try {
    const res = await linearListRecentIssues();
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, issues: [], error: res.error },
        { status: 502 }
      );
    }
    return NextResponse.json({
      configured: true,
      issues: res.issues,
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e), issues: [] },
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
    userAndIpRateScopes(req, "linear:post", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, linearImportSchema);
  if (!parsed.ok) return parsed.response;
  const ref = parsed.data.ref;

  if (!isLinearConfigured()) {
    const { issue, bodyForExtraction } = previewLinearImport(ref);
    return NextResponse.json({
      previewMode: true,
      issue,
      bodyForExtraction,
    });
  }

  try {
    const res = await linearFetchIssueForImport(ref);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 404 });
    }
    return NextResponse.json({
      issue: res.issue,
      bodyForExtraction: res.bodyForExtraction,
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
