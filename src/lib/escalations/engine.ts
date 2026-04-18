import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";
import type { OrgEscalationSeverity } from "@/lib/escalations/types";
import { SEVERITY_RANK } from "@/lib/escalations/types";
import {
  fetchActiveCommitmentsForOrg,
  fetchCommitmentsByIds,
  fetchUnresolvedEscalationForCommitment,
  insertOrgEscalation,
  listEscalationsForApi,
  listOrgIdsWithActiveCommitments,
  updateEscalationNotifyFields,
  updateEscalationSeverity,
  type EngineCommitmentRow,
} from "@/lib/escalations/store";
import {
  notifyEscalationCreated,
  notifyEscalationStale24h,
  notifyEscalationStale48h,
} from "@/lib/escalations/notify";

function parseMs(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Highest matching severity for an active commitment, or null if no rule fires.
 * Uses last_activity_at as "last status update".
 */
export function computeDesiredSeverity(c: EngineCommitmentRow, nowMs: number): OrgEscalationSeverity | null {
  const deadline = parseMs(c.deadline);
  const lastAct = parseMs(c.last_activity_at);

  if (deadline < nowMs) {
    return "overdue";
  }

  const hoursToDeadline = (deadline - nowMs) / 3600000;

  if (hoursToDeadline <= 24) {
    if (nowMs - lastAct >= 24 * 3600000) return "critical";
    return null;
  }
  if (hoursToDeadline <= 48) {
    if (nowMs - lastAct >= 48 * 3600000) return "urgent";
    return null;
  }
  if (hoursToDeadline <= 72) {
    if (nowMs - lastAct >= 48 * 3600000) return "warning";
    return null;
  }
  return null;
}

export type EscalationEngineResult = {
  orgId: string;
  created: number;
  upgraded: number;
  stale24: number;
  stale48: number;
};

async function processStaleFollowUps(orgId: string, nowMs: number): Promise<{ stale24: number; stale48: number }> {
  const open = await listEscalationsForApi({ orgId, resolved: "open", snoozed: "no", limit: 500 });
  const needCommitments = [...new Set(open.map((e) => e.commitmentId))];
  const commitments = await fetchCommitmentsByIds(orgId, needCommitments);
  const byId = new Map(commitments.map((c) => [c.id, c]));

  let stale24 = 0;
  let stale48 = 0;

  for (const e of open) {
    const age = nowMs - parseMs(e.createdAt);
    const c = byId.get(e.commitmentId);
    if (!c) continue;

    if (age >= 24 * 3600000 && !e.notifiedAdminAt) {
      const ok = await notifyEscalationStale24h({
        orgId,
        commitmentId: c.id,
        title: c.title,
        deadline: c.deadline,
        ownerId: c.owner_id,
        escalation: e,
      });
      if (ok) {
        const ts = new Date().toISOString();
        await updateEscalationNotifyFields(e.id, { notifiedAdminAt: ts });
        e.notifiedAdminAt = ts;
        stale24++;
      }
    }

    if (age >= 48 * 3600000 && !e.notifiedAllAdminsAt) {
      const ok = await notifyEscalationStale48h({
        orgId,
        commitmentId: c.id,
        title: c.title,
        deadline: c.deadline,
        ownerId: c.owner_id,
        escalation: e,
      });
      if (ok) {
        await updateEscalationNotifyFields(e.id, {
          notifiedAllAdminsAt: new Date().toISOString(),
        });
        stale48++;
      }
    }
  }

  return { stale24, stale48 };
}

export async function runEscalationEngine(orgId: string): Promise<EscalationEngineResult> {
  const nowMs = Date.now();
  const commitments = await fetchActiveCommitmentsForOrg(orgId);
  let created = 0;
  let upgraded = 0;

  for (const c of commitments) {
    const desired = computeDesiredSeverity(c, nowMs);
    if (!desired) continue;

    const unresolved = await fetchUnresolvedEscalationForCommitment(c.id);
    if (unresolved?.snoozedUntil && parseMs(unresolved.snoozedUntil) > nowMs) {
      continue;
    }

    if (!unresolved) {
      const row = await insertOrgEscalation({
        orgId,
        commitmentId: c.id,
        severity: desired,
      });
      const patch = await notifyEscalationCreated({
        orgId,
        commitmentId: c.id,
        title: c.title,
        deadline: c.deadline,
        ownerId: c.owner_id,
        severity: desired,
        escalation: row,
        isUpgrade: false,
      });
      await updateEscalationNotifyFields(row.id, {
        notifiedOwnerAt: patch.notifiedOwnerAt,
        notifiedManagerAt: patch.notifiedManagerAt,
        notifiedAdminAt: patch.notifiedAdminAt,
      });
      broadcastOrgDashboardEvent(orgId);
      created++;
      continue;
    }

    if (SEVERITY_RANK[desired] > SEVERITY_RANK[unresolved.severity]) {
      await updateEscalationSeverity(unresolved.id, desired);
      const updated = { ...unresolved, severity: desired, triggeredAt: new Date().toISOString() };
      const patch = await notifyEscalationCreated({
        orgId,
        commitmentId: c.id,
        title: c.title,
        deadline: c.deadline,
        ownerId: c.owner_id,
        severity: desired,
        escalation: updated,
        isUpgrade: true,
      });
      await updateEscalationNotifyFields(unresolved.id, {
        notifiedOwnerAt: patch.notifiedOwnerAt,
        notifiedManagerAt: patch.notifiedManagerAt,
        notifiedAdminAt: patch.notifiedAdminAt,
      });
      broadcastOrgDashboardEvent(orgId);
      upgraded++;
    }
  }

  const { stale24, stale48 } = await processStaleFollowUps(orgId, nowMs);
  if (stale24 > 0 || stale48 > 0) {
    broadcastOrgDashboardEvent(orgId);
  }

  return { orgId, created, upgraded, stale24, stale48 };
}

export async function runEscalationEngineForAllOrgs(): Promise<{
  orgs: number;
  results: EscalationEngineResult[];
}> {
  const orgIds = await listOrgIdsWithActiveCommitments();
  const results: EscalationEngineResult[] = [];
  for (const orgId of orgIds) {
    results.push(await runEscalationEngine(orgId));
  }
  return { orgs: orgIds.length, results };
}
