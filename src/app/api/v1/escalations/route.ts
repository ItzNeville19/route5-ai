import type { NextRequest } from "next/server";
import { withPublicApi } from "@/lib/public-api/middleware";
import { jsonListSuccess } from "@/lib/public-api/response";
import {
  fetchCommitmentsByIds,
  listEscalationsForApi,
} from "@/lib/escalations/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { SEVERITY_RANK } from "@/lib/escalations/types";
import type { OrgEscalationSeverity } from "@/lib/escalations/types";

export const runtime = "nodejs";

type Row = {
  id: string;
  orgId: string;
  commitmentId: string;
  severity: OrgEscalationSeverity;
  triggeredAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  snoozedUntil: string | null;
  snoozeReason: string | null;
  createdAt: string;
  commitmentTitle: string;
  commitmentDeadline: string;
  ownerId: string;
  ownerDisplayName: string;
};

function sortEscalations(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const sr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sr !== 0) return sr;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });
}

export async function GET(req: NextRequest) {
  return withPublicApi(req, "read", async (ctx) => {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
    const resolvedParam = url.searchParams.get("resolved");
    const resolved =
      resolvedParam === "resolved" || resolvedParam === "all" || resolvedParam === "open"
        ? resolvedParam
        : "open";
    const snoozedParam = url.searchParams.get("snoozed");
    const snoozed =
      snoozedParam === "yes" || snoozedParam === "no" ? snoozedParam : "any";

    const all = await listEscalationsForApi({
      orgId: ctx.orgId,
      severity: url.searchParams.get("severity") ?? undefined,
      commitmentId: url.searchParams.get("commitment_id") ?? undefined,
      resolved,
      snoozed: resolved === "open" ? (snoozed as "yes" | "no" | "any") : "any",
      limit: 5000,
      offset: 0,
    });
    const total = all.length;
    const page = all.slice(offset, offset + limit);

    const cids = [...new Set(page.map((r) => r.commitmentId))];
    const commitments = await fetchCommitmentsByIds(ctx.orgId, cids);
    const cMap = new Map(commitments.map((c) => [c.id, c]));
    const ownerIds = [...new Set(commitments.map((c) => c.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);

    const enriched: Row[] = [];
    for (const e of page) {
      const c = cMap.get(e.commitmentId);
      if (!c) continue;
      enriched.push({
        id: e.id,
        orgId: e.orgId,
        commitmentId: e.commitmentId,
        severity: e.severity,
        triggeredAt: e.triggeredAt,
        resolvedAt: e.resolvedAt,
        resolvedBy: e.resolvedBy,
        resolutionNotes: e.resolutionNotes,
        snoozedUntil: e.snoozedUntil,
        snoozeReason: e.snoozeReason,
        createdAt: e.createdAt,
        commitmentTitle: c.title,
        commitmentDeadline: c.deadline,
        ownerId: c.owner_id,
        ownerDisplayName: names.get(c.owner_id) ?? c.owner_id.slice(-8),
      });
    }
    const sorted = sortEscalations(enriched);
    return jsonListSuccess(sorted, ctx.requestId, { total, limit, offset });
  });
}
