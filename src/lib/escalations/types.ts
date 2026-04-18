export type OrgEscalationSeverity = "warning" | "urgent" | "critical" | "overdue";

export type OrgEscalationRow = {
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
  notifiedOwnerAt: string | null;
  notifiedManagerAt: string | null;
  notifiedAdminAt: string | null;
  notifiedAllAdminsAt: string | null;
  createdAt: string;
};

export const SEVERITY_RANK: Record<OrgEscalationSeverity, number> = {
  warning: 1,
  urgent: 2,
  critical: 3,
  overdue: 4,
};
