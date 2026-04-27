import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import {
  DEFAULT_COMMITMENT_OPS_POLICY,
  type CommitmentOpsPolicy,
} from "@/lib/agents/commitment-ops-agent";

export const runtime = "nodejs";

const META_KEY = "route5CommitmentOpsPolicy";

const bodySchema = z
  .object({
    mode: z
      .enum(["suggest_then_approve", "auto_send_limited", "fully_automatic"])
      .optional(),
    sendOwnerNudges: z.boolean().optional(),
    includeOverdue: z.boolean().optional(),
  })
  .strict();

function mergePolicy(raw: unknown): CommitmentOpsPolicy {
  const base = DEFAULT_COMMITMENT_OPS_POLICY;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const data = raw as Partial<CommitmentOpsPolicy>;
  return {
    mode:
      data.mode === "suggest_then_approve" ||
      data.mode === "auto_send_limited" ||
      data.mode === "fully_automatic"
        ? data.mode
        : base.mode,
    sendOwnerNudges:
      typeof data.sendOwnerNudges === "boolean"
        ? data.sendOwnerNudges
        : base.sendOwnerNudges,
    includeOverdue:
      typeof data.includeOverdue === "boolean"
        ? data.includeOverdue
        : base.includeOverdue,
  };
}

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager", "member"]);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const raw = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
  return NextResponse.json({ ok: true, policy: mergePolicy(raw) });
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const payload = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
  const merged = mergePolicy({ ...mergePolicy(existing), ...parsed.data });
  await client.users.updateUser(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      [META_KEY]: merged,
    },
  });
  return NextResponse.json({ ok: true, policy: merged });
}
