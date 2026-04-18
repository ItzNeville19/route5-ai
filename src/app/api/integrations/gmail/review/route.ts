import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listGmailReviewQueue } from "@/lib/integrations/org-integrations-store";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const rows = await listGmailReviewQueue(orgId);
    return NextResponse.json({
      pending: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        content: r.bodyText,
        confidenceScore: r.confidenceScore,
        decisionText: r.decisionText,
        capturedAt: r.capturedAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
