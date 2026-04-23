import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import { listOrgCommitmentsForOrgId } from "@/lib/org-commitments/repository";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const openOnly = url.searchParams.get("openOnly") === "1";
    const result = await listOrgCommitmentsForOrgId(access.orgId, {
      status,
      sort: "deadline",
      order: "asc",
      limit: 100,
      offset: 0,
    });
    const rows = openOnly ? result.rows.filter((row) => row.status !== "completed") : result.rows;
    return NextResponse.json({ commitments: rows, total: rows.length });
  } catch (error) {
    return NextResponse.json({ error: publicWorkspaceError(error) }, { status: 503 });
  }
}
