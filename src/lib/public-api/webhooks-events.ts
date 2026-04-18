import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import type { OrgEscalationRow } from "@/lib/escalations/types";
import { deliverWebhookEvent } from "@/lib/public-api/webhooks";

function commitmentPayload(row: OrgCommitmentRow) {
  return {
    id: row.id,
    org_id: row.orgId,
    title: row.title,
    description: row.description,
    owner_id: row.ownerId,
    project_id: row.projectId,
    deadline: row.deadline,
    priority: row.priority,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    completed_at: row.completedAt,
    last_activity_at: row.lastActivityAt,
  };
}

export async function emitCommitmentCreated(orgId: string, row: OrgCommitmentRow): Promise<void> {
  void deliverWebhookEvent(orgId, "commitment.created", { commitment: commitmentPayload(row) });
}

export async function emitCommitmentUpdated(
  orgId: string,
  row: OrgCommitmentRow,
  prev?: { status: string; completedAt: string | null }
): Promise<void> {
  void deliverWebhookEvent(orgId, "commitment.updated", { commitment: commitmentPayload(row) });
  if (prev && row.status === "completed" && prev.status !== "completed") {
    void deliverWebhookEvent(orgId, "commitment.completed", { commitment: commitmentPayload(row) });
  }
  if (prev && row.status === "overdue" && prev.status !== "overdue") {
    void deliverWebhookEvent(orgId, "commitment.overdue", { commitment: commitmentPayload(row) });
  }
}

export async function emitCommitmentOverdue(orgId: string, row: OrgCommitmentRow): Promise<void> {
  void deliverWebhookEvent(orgId, "commitment.overdue", { commitment: commitmentPayload(row) });
}

export async function emitEscalationFired(orgId: string, esc: OrgEscalationRow): Promise<void> {
  void deliverWebhookEvent(orgId, "escalation.fired", {
    escalation: {
      id: esc.id,
      org_id: esc.orgId,
      commitment_id: esc.commitmentId,
      severity: esc.severity,
      triggered_at: esc.triggeredAt,
      created_at: esc.createdAt,
    },
  });
}

export async function emitEscalationResolved(orgId: string, esc: OrgEscalationRow): Promise<void> {
  void deliverWebhookEvent(orgId, "escalation.resolved", {
    escalation: {
      id: esc.id,
      org_id: esc.orgId,
      commitment_id: esc.commitmentId,
      severity: esc.severity,
      resolved_at: esc.resolvedAt,
      resolved_by: esc.resolvedBy,
      resolution_notes: esc.resolutionNotes,
    },
  });
}

export async function emitEscalationSnoozed(orgId: string, esc: OrgEscalationRow): Promise<void> {
  void deliverWebhookEvent(orgId, "escalation.snoozed", {
    escalation: {
      id: esc.id,
      org_id: esc.orgId,
      commitment_id: esc.commitmentId,
      snoozed_until: esc.snoozedUntil,
      snooze_reason: esc.snoozeReason,
    },
  });
}
