import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/lib/public-api/types";
import {
  insertWebhookEndpoint,
  listWebhookEndpointsForOrg,
  listWebhookDeliveriesForEndpoint,
} from "@/lib/public-api/webhooks-store";

export const runtime = "nodejs";

const eventTypeSchema = z.string().refine(
  (s): s is WebhookEventType => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(s),
  "Invalid event type"
);

const postSchema = z
  .object({
    url: z.string().url(),
    description: z.string().max(500).optional().nullable(),
    events: z.array(eventTypeSchema).min(1),
  })
  .strict();

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const endpoints = await listWebhookEndpointsForOrg(orgId);
    const withLast = await Promise.all(
      endpoints.map(async (ep) => {
        const recent = await listWebhookDeliveriesForEndpoint(orgId, ep.id, 1);
        const last = recent[0];
        return {
          id: ep.id,
          url: ep.url,
          description: ep.description,
          events: ep.events,
          enabled: ep.enabled,
          created_at: ep.createdAt,
          updated_at: ep.updatedAt,
          last_delivery: last
            ? {
                id: last.id,
                event_type: last.eventType,
                response_status: last.responseStatus,
                attempt_count: last.attemptCount,
                delivered_at: last.deliveredAt,
                failed_at: last.failedAt,
                next_retry_at: last.nextRetryAt,
                created_at: last.createdAt,
              }
            : null,
        };
      })
    );
    return NextResponse.json({ endpoints: withLast });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const secret = randomBytes(32).toString("hex");
    const ep = await insertWebhookEndpoint({
      orgId,
      url: parsed.data.url,
      description: parsed.data.description ?? null,
      secret,
      events: parsed.data.events,
    });
    return NextResponse.json({
      endpoint: {
        id: ep.id,
        url: ep.url,
        description: ep.description,
        events: ep.events,
        enabled: ep.enabled,
        created_at: ep.createdAt,
      },
      secret,
      warning: "Save this signing secret now — it will not be shown again.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
