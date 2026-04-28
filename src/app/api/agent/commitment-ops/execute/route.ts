import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import {
  executeCommitmentOpsActions,
  type CommitmentOpsAction,
} from "@/lib/agents/commitment-ops-agent";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    actions: z
      .array(
        z
          .object({
            commitmentId: z.string().min(1),
            ownerId: z.string().min(1),
            title: z.string().min(1),
            severity: z.enum(["warning", "urgent", "critical", "overdue"]),
            kind: z.enum(["owner_nudge", "escalate"]),
            message: z.string().min(1),
          })
          .strict()
      )
      .max(200),
  })
  .strict();

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const payload = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  try {
    const summary = await executeCommitmentOpsActions(
      access.orgId,
      parsed.data.actions as CommitmentOpsAction[]
    );
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: publicWorkspaceError(error) },
      { status: 503 }
    );
  }
}
