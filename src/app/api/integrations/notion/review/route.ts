import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listNotionReviewQueue } from "@/lib/integrations/notion-store";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await listNotionReviewQueue(orgId);
    return NextResponse.json({
      pending: rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.contentText,
        confidenceScore: r.confidenceScore,
        decisionText: r.decisionText,
        capturedAt: r.capturedAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
