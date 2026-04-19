import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listNotionReviewQueue } from "@/lib/integrations/notion-store";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

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
