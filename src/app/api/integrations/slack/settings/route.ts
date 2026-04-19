import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getSlackIntegrationForOrg, updateSlackIntegrationMetadata } from "@/lib/integrations/org-integrations-store";
import type { OrgIntegrationMetadata } from "@/lib/integrations/types";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const schema = z
  .object({
    monitored_channel_ids: z.array(z.string()).optional(),
    digest_channel_id: z.string().nullable().optional(),
    escalation_channel_id: z.string().nullable().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "slack:settings", userId, { userLimit: 60, ipLimit: 120 })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const integ = await getSlackIntegrationForOrg(orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
    }
    const body = parsed.data;
    const meta: OrgIntegrationMetadata = {
      ...integ.metadata,
      ...(body.monitored_channel_ids !== undefined
        ? { monitored_channel_ids: body.monitored_channel_ids }
        : {}),
      ...(body.digest_channel_id !== undefined ? { digest_channel_id: body.digest_channel_id } : {}),
      ...(body.escalation_channel_id !== undefined
        ? { escalation_channel_id: body.escalation_channel_id }
        : {}),
    };
    await updateSlackIntegrationMetadata(orgId, meta);
    return NextResponse.json({ ok: true, metadata: meta });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
