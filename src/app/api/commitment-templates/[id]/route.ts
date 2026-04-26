import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import { getServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    default_owner: z.string().max(200).nullable().optional(),
    due_days_offset: z.number().int().min(0).max(365).optional(),
    completion_expectations: z.string().max(4000).nullable().optional(),
    source: z.enum(["meeting", "email", "slack", "manual"]).optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is required." }, { status: 503 });
  }
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const body = parsed.data;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitment_templates")
      .update({
        title: body.title?.trim(),
        description: body.description?.trim() || body.description || null,
        default_owner: body.default_owner?.trim() || body.default_owner || null,
        due_days_offset: body.due_days_offset,
        completion_expectations:
          body.completion_expectations?.trim() || body.completion_expectations || null,
        source: body.source,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", access.orgId)
      .is("archived_at", null)
      .select(
        "id, org_id, title, description, default_owner, due_days_offset, completion_expectations, source, created_by"
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      template: {
        id: String(data.id),
        orgId: data.org_id ? String(data.org_id) : null,
        title: String(data.title),
        description: data.description ? String(data.description) : null,
        defaultOwner: data.default_owner ? String(data.default_owner) : null,
        dueDaysOffset: Number(data.due_days_offset ?? 0),
        completionExpectations: data.completion_expectations
          ? String(data.completion_expectations)
          : null,
        source: (data.source ?? "manual") as "meeting" | "email" | "slack" | "manual",
        createdBy: String(data.created_by),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is required." }, { status: 503 });
  }
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitment_templates")
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", access.orgId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
