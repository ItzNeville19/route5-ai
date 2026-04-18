export type ApiScope = "read" | "write" | "webhooks";

export const WEBHOOK_EVENT_TYPES = [
  "commitment.created",
  "commitment.updated",
  "commitment.completed",
  "commitment.overdue",
  "escalation.fired",
  "escalation.resolved",
  "escalation.snoozed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
