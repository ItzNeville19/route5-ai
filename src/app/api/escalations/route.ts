import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import {
  fetchCommitmentsByIds,
  listEscalationsForApi,
} from "@/lib/escalations/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { SEVERITY_RANK } from "@/lib/escalations/types";
import type { OrgEscalationSeverity } from "@/lib/escalations/types";
import {
  enforceRateLimits,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

export type EscalationApiRow = {
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
  isOpen: boolean;
  isSnoozedActive: boolean;
  ageHours: number;
};

function sortEscalations(rows: EscalationApiRow[]): EscalationApiRow[] {
  return [...rows].sort((a, b) => {
    const sr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sr !== 0) return sr;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });
}

export async function GET(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "org-escalations:list", userId, {
      userLimit: 120,
      ipLimit: 240,
    })
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const projectIdFilter = url.searchParams.get("projectId") ?? undefined;
  const resolvedParam = url.searchParams.get("resolved");
  const resolved =
    resolvedParam === "resolved" || resolvedParam === "all" || resolvedParam === "open"
      ? resolvedParam
      : "open";
  const snoozedParam = url.searchParams.get("snoozed");
  const snoozed =
    snoozedParam === "yes" || snoozedParam === "no" ? snoozedParam : "any";

  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limit")) || 200),
      500
    );
    const rows = await listEscalationsForApi({
      orgId,
      severity: url.searchParams.get("severity") ?? undefined,
      commitmentId: url.searchParams.get("commitment_id") ?? undefined,
      resolved,
      snoozed: resolved === "open" ? (snoozed as "yes" | "no" | "any") : "any",
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      limit,
    });

    const cids = [...new Set(rows.map((r) => r.commitmentId))];
    const commitments = await fetchCommitmentsByIds(orgId, cids);
    const cMap = new Map(commitments.map((c) => [c.id, c]));
    const ownerIds = [...new Set(commitments.map((c) => c.owner_id))];
    const names = await resolveOwnerDisplayNames(ownerIds);

    const enriched: EscalationApiRow[] = [];
    const nowMs = Date.now();
    for (const e of rows) {
      const c = cMap.get(e.commitmentId);
      if (!c) continue;
      if (projectIdFilter) {
        const pid = (c as { project_id?: string | null }).project_id ?? null;
        if (pid !== projectIdFilter) continue;
      }
      const snoozedActive =
        !!e.snoozedUntil && new Date(e.snoozedUntil).getTime() > nowMs;
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
        isOpen: !e.resolvedAt,
        isSnoozedActive: snoozedActive,
        ageHours: Math.max(
          0,
          Math.floor((nowMs - new Date(e.triggeredAt).getTime()) / 3_600_000)
        ),
      });
    }

    const sorted = sortEscalations(enriched);
    const summary = {
      total: sorted.length,
      open: sorted.filter((x) => x.isOpen && !x.isSnoozedActive).length,
      snoozed: sorted.filter((x) => x.isOpen && x.isSnoozedActive).length,
      resolved: sorted.filter((x) => !x.isOpen).length,
      overdue: sorted.filter((x) => x.severity === "overdue" && x.isOpen).length,
      critical: sorted.filter((x) => x.severity === "critical" && x.isOpen).length,
    };
    return NextResponse.json({
      orgId,
      escalations: sorted,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
