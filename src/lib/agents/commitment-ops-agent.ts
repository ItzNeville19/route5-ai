import { runEscalationEngine, runEscalationEngineForAllOrgs } from "@/lib/escalations/engine";
import {
  fetchActiveCommitmentsForOrg,
  fetchCommitmentsByIds,
  fetchUnresolvedEscalationForCommitment,
  insertOrgEscalation,
  listEscalationsForApi,
  updateEscalationNotifyFields,
  updateEscalationSeverity,
  type EngineCommitmentRow,
} from "@/lib/escalations/store";
import { computeDesiredSeverity } from "@/lib/escalations/engine";
import { notifyEscalationCreated } from "@/lib/escalations/notify";
import { SEVERITY_RANK } from "@/lib/escalations/types";
import { sendNotification } from "@/lib/notifications/service";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";

export type CommitmentOpsExecutionMode =
  | "suggest_then_approve"
  | "auto_send_limited"
  | "fully_automatic";

export type CommitmentOpsPolicy = {
  mode: CommitmentOpsExecutionMode;
  sendOwnerNudges: boolean;
  includeOverdue: boolean;
};

export const DEFAULT_COMMITMENT_OPS_POLICY: CommitmentOpsPolicy = {
  mode: "auto_send_limited",
  sendOwnerNudges: true,
  includeOverdue: true,
};

export type CommitmentOpsAction = {
  commitmentId: string;
  ownerId: string;
  title: string;
  severity: "warning" | "urgent" | "critical" | "overdue";
  kind: "owner_nudge" | "escalate";
  message: string;
};

export type CommitmentOpsRunSummary = {
  orgId: string;
  created: number;
  upgraded: number;
  stale24: number;
  stale48: number;
  openEscalations: number;
  generatedAt: string;
  actionsSuggested: number;
  actionsExecuted: number;
};

export type CommitmentOpsExecuteSummary = {
  orgId: string;
  executed: number;
  nudgesSent: number;
  escalationsCreated: number;
  escalationsUpgraded: number;
  generatedAt: string;
};

function buildNudgeMessage(commitment: EngineCommitmentRow, severity: CommitmentOpsAction["severity"]) {
  const deadline = new Date(commitment.deadline).toLocaleString();
  if (severity === "overdue") {
    return `This commitment is overdue (${deadline}). Please update status and next step now.`;
  }
  if (severity === "critical") {
    return `This commitment is due very soon (${deadline}) and needs immediate progress update.`;
  }
  if (severity === "urgent") {
    return `This commitment is approaching deadline (${deadline}). Share blocker/progress update.`;
  }
  return `This commitment has low momentum against deadline (${deadline}). Please post a quick progress update.`;
}

export async function previewCommitmentOpsActions(
  orgId: string,
  policy: CommitmentOpsPolicy = DEFAULT_COMMITMENT_OPS_POLICY,
  projectId?: string | null
): Promise<CommitmentOpsAction[]> {
  const commitments = await fetchActiveCommitmentsForOrg(orgId, projectId);
  const now = Date.now();
  const actions: CommitmentOpsAction[] = [];
  for (const commitment of commitments) {
    const desired = computeDesiredSeverity(commitment, now);
    if (!desired) continue;
    if (desired === "overdue" && !policy.includeOverdue) continue;
    const unresolved = await fetchUnresolvedEscalationForCommitment(commitment.id);
    const shouldEscalate = !unresolved;
    if (shouldEscalate) {
      actions.push({
        commitmentId: commitment.id,
        ownerId: commitment.owner_id,
        title: commitment.title,
        severity: desired,
        kind: "escalate",
        message: `Escalate commitment due to ${desired} risk.`,
      });
    }
    if (policy.sendOwnerNudges) {
      actions.push({
        commitmentId: commitment.id,
        ownerId: commitment.owner_id,
        title: commitment.title,
        severity: desired,
        kind: "owner_nudge",
        message: buildNudgeMessage(commitment, desired),
      });
    }
  }
  return actions.slice(0, 100);
}

/** One nudge per owner+commitment per execute — keep strongest severity if duplicates slip in. */
function dedupeOwnerNudges(actions: CommitmentOpsAction[]): CommitmentOpsAction[] {
  const best = new Map<string, CommitmentOpsAction>();
  for (const action of actions) {
    if (action.kind !== "owner_nudge") continue;
    const key = `${action.ownerId}:${action.commitmentId}`;
    const prev = best.get(key);
    if (!prev || SEVERITY_RANK[action.severity] > SEVERITY_RANK[prev.severity]) {
      best.set(key, action);
    }
  }
  return [...best.values()];
}

async function executeOwnerNudges(orgId: string, actions: CommitmentOpsAction[]) {
  const nudges = dedupeOwnerNudges(actions);
  let sent = 0;
  for (const action of nudges) {
    await sendNotification({
      orgId,
      userId: action.ownerId,
      type: action.severity === "overdue" ? "commitment_overdue" : "commitment_due_soon",
      title: `Route5 Agent: ${action.title.slice(0, 90)}`,
      body: action.message,
      metadata: {
        commitmentId: action.commitmentId,
        severity: action.severity,
        source: "commitment_ops_agent",
      },
      forceChannels: { inApp: true, email: true, slack: true },
    });
    sent += 1;
  }
  return sent;
}

async function executeEscalationActions(
  orgId: string,
  actions: CommitmentOpsAction[]
): Promise<{ executed: number; created: number; upgraded: number }> {
  const selectedEscalations = actions
    .filter((action) => action.kind === "escalate")
    .reduce((acc, action) => {
      const current = acc.get(action.commitmentId);
      if (!current || SEVERITY_RANK[action.severity] > SEVERITY_RANK[current.severity]) {
        acc.set(action.commitmentId, action);
      }
      return acc;
    }, new Map<string, CommitmentOpsAction>());
  const rows = await fetchCommitmentsByIds(orgId, [...selectedEscalations.keys()]);
  let created = 0;
  let upgraded = 0;
  let executed = 0;
  for (const row of rows) {
    const selected = selectedEscalations.get(row.id);
    if (!selected) continue;
    const unresolved = await fetchUnresolvedEscalationForCommitment(row.id);
    if (unresolved?.snoozedUntil && new Date(unresolved.snoozedUntil).getTime() > Date.now()) {
      continue;
    }
    const desired = computeDesiredSeverity(row, Date.now());
    if (!desired) continue;
    if (!unresolved) {
      const createdEscalation = await insertOrgEscalation({
        orgId,
        commitmentId: row.id,
        severity: desired,
      });
      const patch = await notifyEscalationCreated({
        orgId,
        commitmentId: row.id,
        title: row.title,
        deadline: row.deadline,
        ownerId: row.owner_id,
        severity: desired,
        escalation: createdEscalation,
        isUpgrade: false,
      });
      await updateEscalationNotifyFields(createdEscalation.id, {
        notifiedOwnerAt: patch.notifiedOwnerAt,
        notifiedManagerAt: patch.notifiedManagerAt,
        notifiedAdminAt: patch.notifiedAdminAt,
      });
      created += 1;
      executed += 1;
      continue;
    }
    if (SEVERITY_RANK[desired] > SEVERITY_RANK[unresolved.severity]) {
      await updateEscalationSeverity(unresolved.id, desired);
      const patch = await notifyEscalationCreated({
        orgId,
        commitmentId: row.id,
        title: row.title,
        deadline: row.deadline,
        ownerId: row.owner_id,
        severity: desired,
        escalation: { ...unresolved, severity: desired },
        isUpgrade: true,
      });
      await updateEscalationNotifyFields(unresolved.id, {
        notifiedOwnerAt: patch.notifiedOwnerAt,
        notifiedManagerAt: patch.notifiedManagerAt,
        notifiedAdminAt: patch.notifiedAdminAt,
      });
      upgraded += 1;
      executed += 1;
    }
  }
  if (executed > 0) {
    broadcastOrgDashboardEvent(orgId);
  }
  return { executed, created, upgraded };
}

export async function executeCommitmentOpsActions(
  orgId: string,
  actions: CommitmentOpsAction[]
): Promise<CommitmentOpsExecuteSummary> {
  const nudgesSent = await executeOwnerNudges(orgId, actions);
  const escalation = await executeEscalationActions(orgId, actions);
  return {
    orgId,
    executed: nudgesSent + escalation.executed,
    nudgesSent,
    escalationsCreated: escalation.created,
    escalationsUpgraded: escalation.upgraded,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCommitmentOpsAgentForOrg(
  orgId: string,
  policy: CommitmentOpsPolicy = DEFAULT_COMMITMENT_OPS_POLICY
): Promise<CommitmentOpsRunSummary> {
  const actions = await previewCommitmentOpsActions(orgId, policy);
  if (policy.mode === "suggest_then_approve") {
    const openEscalations = (
      await listEscalationsForApi({
        orgId,
        resolved: "open",
        snoozed: "any",
        limit: 500,
      })
    ).length;
    return {
      orgId,
      created: 0,
      upgraded: 0,
      stale24: 0,
      stale48: 0,
      openEscalations,
      generatedAt: new Date().toISOString(),
      actionsSuggested: actions.length,
      actionsExecuted: 0,
    };
  }

  let executed = 0;
  if (policy.mode === "auto_send_limited" || policy.mode === "fully_automatic") {
    executed += await executeOwnerNudges(orgId, actions);
  }

  const result = await runEscalationEngine(orgId);
  const openEscalations = (
    await listEscalationsForApi({
      orgId,
      resolved: "open",
      snoozed: "any",
      limit: 500,
    })
  ).length;
  return {
    orgId,
    created: result.created,
    upgraded: result.upgraded,
    stale24: result.stale24,
    stale48: result.stale48,
    openEscalations,
    generatedAt: new Date().toISOString(),
    actionsSuggested: actions.length,
    actionsExecuted: executed,
  };
}

export async function runCommitmentOpsAgentForAllOrgs() {
  const result = await runEscalationEngineForAllOrgs();
  return {
    orgs: result.orgs,
    results: result.results,
    generatedAt: new Date().toISOString(),
  };
}
