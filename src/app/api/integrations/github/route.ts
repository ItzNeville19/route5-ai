import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  githubFetchIssueForImport,
  githubListAssignedIssues,
  isGitHubConfigured,
} from "@/lib/github-api";
import { PREVIEW_GITHUB_ISSUES, previewGitHubImport } from "@/lib/integration-preview-data";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const githubImportSchema = z
  .object({
    ref: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(1, "Missing ref (issue URL or owner/repo#123).").max(500)),
  })
  .strict();

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "github:get", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  if (!isGitHubConfigured()) {
    return NextResponse.json({
      configured: false,
      previewMode: true,
      issues: PREVIEW_GITHUB_ISSUES,
    });
  }

  try {
    const res = await githubListAssignedIssues();
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "github:post", userId, {
      userLimit: 30,
      ipLimit: 60,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, githubImportSchema);
  if (!parsed.ok) return parsed.response;
  const ref = parsed.data.ref;

  if (!isGitHubConfigured()) {
    const { issue, bodyForExtraction } = previewGitHubImport(ref);
    return NextResponse.json({
      previewMode: true,
      issue,
      bodyForExtraction,
    });
  }

  try {
    const res = await githubFetchIssueForImport(ref);
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
