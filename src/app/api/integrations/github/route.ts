import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  githubFetchIssueForImport,
  githubListAssignedIssues,
  isGitHubConfigured,
} from "@/lib/github-api";
import { DEMO_GITHUB_ISSUES, demoGitHubImport } from "@/lib/integration-demo-data";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGitHubConfigured()) {
    return NextResponse.json({
      configured: false,
      demoMode: true,
      issues: DEMO_GITHUB_ISSUES,
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

  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = typeof body.ref === "string" ? body.ref : "";
  if (!ref.trim()) {
    return NextResponse.json(
      { error: "Missing ref (issue URL or owner/repo#123)." },
      { status: 400 }
    );
  }

  if (!isGitHubConfigured()) {
    const { issue, bodyForExtraction } = demoGitHubImport(ref);
    return NextResponse.json({
      demoMode: true,
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
