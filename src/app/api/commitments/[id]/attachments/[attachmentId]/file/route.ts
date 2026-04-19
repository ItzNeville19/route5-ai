import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import fs from "fs";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import {
  getOrgCommitmentDetail,
  getSqliteAttachmentForDownload,
} from "@/lib/org-commitments/repository";
import {
  enforceRateLimits,
  isWorkspaceResourceId,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-commitments:file", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const { id: commitmentId, attachmentId } = await ctx.params;
  if (!isWorkspaceResourceId(commitmentId) || !isWorkspaceResourceId(attachmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const owned = await getOrgCommitmentDetail(userId, commitmentId);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const row = await supabase
      .from("org_commitment_attachments")
      .select("file_url, file_name")
      .eq("id", attachmentId)
      .eq("commitment_id", commitmentId)
      .maybeSingle();
    const data = row.data as { file_url: string; file_name: string } | null;
    if (!data?.file_url || data.file_url.startsWith("sqlite-local:")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { data: blob, error } = await supabase.storage
      .from("commitment-attachments")
      .download(data.file_url);
    if (error || !blob) {
      return NextResponse.json({ error: "Could not load file" }, { status: 502 });
    }
    const ab = await blob.arrayBuffer();
    return new NextResponse(ab, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(data.file_name)}"`,
      },
    });
  }

  const local = getSqliteAttachmentForDownload(userId, commitmentId, attachmentId);
  if (!local) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!fs.existsSync(local.localPath)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const buf = fs.readFileSync(local.localPath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(local.fileName)}"`,
    },
  });
}
