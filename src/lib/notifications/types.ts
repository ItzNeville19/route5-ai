export const NOTIFICATION_TYPES = [
  "commitment_assigned",
  "commitment_due_soon",
  "commitment_overdue",
  "chat_message",
  "escalation_fired",
  "escalation_escalated",
  "security_login_alert",
  "marketing_product_updates",
  "marketing_feature_tips",
  "payment_failed",
  "subscription_cancelled",
  "trial_ending",
  "team_invited",
  "daily_morning_digest",
  "weekly_summary",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type OrgNotificationRow = {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

export type NotificationPreferenceRow = {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  slack: boolean;
  createdAt: string;
  updatedAt: string;
};
