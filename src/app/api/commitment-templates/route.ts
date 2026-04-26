import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";
import { getServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

const postSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    default_owner: z.string().max(200).nullable().optional(),
    due_days_offset: z.number().int().min(0).max(365).optional(),
    completion_expectations: z.string().max(4000).nullable().optional(),
    source: z.enum(["meeting", "email", "slack", "manual"]).optional(),
  })
  .strict();

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ templates: [] });
  }
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager", "member"]);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitment_templates")
      .select(
        "id, org_id, title, description, default_owner, due_days_offset, completion_expectations, source, created_by, created_at, updated_at"
      )
      .or(`org_id.eq.${access.orgId},org_id.is.null`)
      .is("archived_at", null)
      .order("org_id", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      templates: (data ?? []).map((row) => ({
        id: String(row.id),
        orgId: row.org_id ? String(row.org_id) : null,
        title: String(row.title),
        description: row.description ? String(row.description) : null,
        defaultOwner: row.default_owner ? String(row.default_owner) : null,
        dueDaysOffset: Number(row.due_days_offset ?? 0),
        completionExpectations: row.completion_expectations
          ? String(row.completion_expectations)
          : null,
        source: (row.source ?? "manual") as "meeting" | "email" | "slack" | "manual",
        createdBy: String(row.created_by),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is required." }, { status: 503 });
  }
  const { userId } = authz;
  const access = await requireOrgRole(userId, ["admin", "manager"]);
  if (!access.ok) {
    return NextResponse.json({ error: "Only admins or managers can create templates." }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("commitment_templates")
      .insert({
        org_id: access.orgId,
        created_by: userId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        default_owner: body.default_owner?.trim() || null,
        due_days_offset: body.due_days_offset ?? 3,
        completion_expectations: body.completion_expectations?.trim() || null,
        source: body.source ?? "manual",
      })
      .select(
        "id, org_id, title, description, default_owner, due_days_offset, completion_expectations, source, created_by"
      )
      .single();
    if (error) throw error;
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
