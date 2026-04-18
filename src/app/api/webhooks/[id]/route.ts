import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/lib/public-api/types";
import {
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  updateWebhookEndpoint,
} from "@/lib/public-api/webhooks-store";

export const runtime = "nodejs";

const eventTypeSchema = z.string().refine(
  (s): s is WebhookEventType => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(s),
  "Invalid event type"
);

const patchSchema = z
  .object({
    url: z.string().url().optional(),
    description: z.string().max(500).optional().nullable(),
    events: z.array(eventTypeSchema).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const existing = await getWebhookEndpoint(orgId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const p = parsed.data;
    const updated = await updateWebhookEndpoint(orgId, id, {
      url: p.url,
      description: p.description,
      events: p.events,
      enabled: p.enabled,
    });
    return NextResponse.json({ endpoint: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const ok = await deleteWebhookEndpoint(orgId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
