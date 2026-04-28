import OpenAI from "openai";
import { getOpenAIApiKey } from "@/lib/ai/openai-client";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type { OrgCommitmentRow, OrgCommitmentStatus } from "@/lib/org-commitment-types";

function mapRow(r: Record<string, unknown>): OrgCommitmentRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    title: String(r.title),
    description: r.description == null ? null : String(r.description),
    ownerId: String(r.owner_id),
    projectId: r.project_id == null ? null : String(r.project_id),
    deadline: String(r.deadline),
    priority: r.priority as OrgCommitmentRow["priority"],
    status: r.status as OrgCommitmentStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    completedAt: r.completed_at == null ? null : String(r.completed_at),
    lastActivityAt: String(r.last_activity_at),
    deletedAt: r.deleted_at == null ? null : String(r.deleted_at),
  };
}

async function listActiveCommitmentsForOrg(orgId: string): Promise<OrgCommitmentRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("org_commitments")
      .select("*")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((x) => mapRow(x as Record<string, unknown>));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(`SELECT * FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL`)
    .all(orgId) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function generateWeeklyExecutiveSummaryHtml(orgId: string): Promise<string | null> {
  const key = getOpenAIApiKey();
  if (!key) return null;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600000;

  const rows = await listActiveCommitmentsForOrg(orgId);

  const completedLastWeek = rows.filter((r) => {
    if (!r.completedAt) return false;
    const t = new Date(r.completedAt).getTime();
    return t >= weekAgo && t <= now;
  });

  const createdLastWeek = rows.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= weekAgo && t <= now;
  });

  const overdue = rows.filter((r) => r.status === "overdue");
  const atRisk = rows.filter((r) => r.status === "at_risk");
  const missed = rows.filter((r) => {
    const d = new Date(r.deadline).getTime();
    return d < now && r.status !== "completed";
  });

  const stats = {
    activeTotal: rows.length,
    completedLastWeek: completedLastWeek.map((r) => ({ title: r.title, completedAt: r.completedAt })),
    createdLastWeek: createdLastWeek.map((r) => ({ title: r.title, deadline: r.deadline, status: r.status })),
    overdueCount: overdue.length,
    atRiskCount: atRisk.length,
    missedApproxCount: missed.length,
    topOverdue: overdue.slice(0, 5).map((r) => ({ title: r.title, deadline: r.deadline })),
    topAtRisk: atRisk.slice(0, 5).map((r) => ({ title: r.title, deadline: r.deadline })),
  };

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: [
          "You write concise executive weekly summaries for Route5.",
          "Output valid HTML only (no markdown, no code fences).",
          "Use a professional tone: <h1> title, <h2> sections, <p>, <ul><li>.",
          "Use subtle inline styles only if needed (font-family: system-ui, sans-serif; color:#111; line-height:1.5).",
          "Summarize: decisions made (from created commitments), completed work, misses, risks, and top 3 priorities.",
          "If data is sparse, say so briefly and keep the email short.",
        ].join(" "),
      },
      {
        role: "user",
        content: `JSON stats for one organization (last 7 days):\n${JSON.stringify(stats)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  return raw;
}
