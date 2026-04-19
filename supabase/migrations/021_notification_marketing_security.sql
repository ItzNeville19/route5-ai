-- Marketing + security notification types for in-app/email/slack preferences.

alter table public.org_notifications
  drop constraint if exists org_notifications_type_check;
alter table public.org_notifications
  add constraint org_notifications_type_check check (
    type in (
      'commitment_assigned',
      'commitment_due_soon',
      'commitment_overdue',
      'chat_message',
      'escalation_fired',
      'escalation_escalated',
      'security_login_alert',
      'marketing_product_updates',
      'marketing_feature_tips',
      'payment_failed',
      'subscription_cancelled',
      'trial_ending',
      'team_invited',
      'daily_morning_digest',
      'weekly_summary'
    )
  );

alter table public.notification_preferences
  drop constraint if exists notification_preferences_type_check;
alter table public.notification_preferences
  add constraint notification_preferences_type_check check (
    type in (
      'commitment_assigned',
      'commitment_due_soon',
      'commitment_overdue',
      'chat_message',
      'escalation_fired',
      'escalation_escalated',
      'security_login_alert',
      'marketing_product_updates',
      'marketing_feature_tips',
      'payment_failed',
      'subscription_cancelled',
      'trial_ending',
      'team_invited',
      'daily_morning_digest',
      'weekly_summary'
    )
  );
