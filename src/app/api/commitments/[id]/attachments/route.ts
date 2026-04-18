import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { addOrgCommitmentAttachment } from "@/lib/org-commitments/repository";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:attach", userId, {
      userLimit: 40,
      ipLimit: 80,
    })
  );
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!isWorkspaceResourceId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const attachment = await addOrgCommitmentAttachment(
      userId,
      id,
      file.name || "upload.bin",
      buf,
      file.type || "application/octet-stream"
    );
    broadcastOrgCommitmentEvent(orgId, { kind: "attachment_added", commitmentId: id });
    return NextResponse.json({ attachment });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
