-- Realtime + notification type compatibility + chat schema compatibility.

-- org_notifications check constraints from older migrations may exclude new types.
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
      'payment_failed',
      'subscription_cancelled',
      'trial_ending',
      'team_invited',
      'daily_morning_digest',
      'weekly_summary'
    )
  );

-- Ensure legacy chat columns do not block current writes.
alter table public.chat_messages
  alter column sender_id drop not null;
alter table public.chat_messages
  alter column channel_type drop not null;
alter table public.chat_messages
  alter column content drop not null;
alter table public.chat_messages
  alter column attachments drop not null;

-- Ensure modern columns are always available.
alter table public.chat_messages
  add column if not exists user_id text,
  add column if not exists body text not null default '',
  add column if not exists attachments_json jsonb not null default '[]'::jsonb,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill modern chat columns.
update public.chat_messages
set
  user_id = coalesce(user_id, sender_id),
  body = case when body = '' then coalesce(content, '') else body end,
  attachments_json = coalesce(attachments_json, attachments, '[]'::jsonb)
where true;

-- Ensure realtime publication includes key collaborative tables.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.chat_messages';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.org_commitments';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.org_members';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.org_notifications';
  exception when duplicate_object then null;
  end;
end $$;
