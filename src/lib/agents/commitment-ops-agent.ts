import { runEscalationEngine, runEscalationEngineForAllOrgs } from "@/lib/escalations/engine";
import {
  fetchActiveCommitmentsForOrg,
  fetchUnresolvedEscalationForCommitment,
  listEscalationsForApi,
  type EngineCommitmentRow,
} from "@/lib/escalations/store";
import { computeDesiredSeverity } from "@/lib/escalations/engine";
import { sendNotification } from "@/lib/notifications/service";

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
  policy: CommitmentOpsPolicy = DEFAULT_COMMITMENT_OPS_POLICY
): Promise<CommitmentOpsAction[]> {
  const commitments = await fetchActiveCommitmentsForOrg(orgId);
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

async function executeOwnerNudges(orgId: string, actions: CommitmentOpsAction[]) {
  let sent = 0;
  for (const action of actions) {
    if (action.kind !== "owner_nudge") continue;
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
