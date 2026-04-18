-- Phase 13: in-app notifications + preferences. Service role only.

create table if not exists public.org_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id text not null,
  type text not null check (
    type in (
      'commitment_assigned',
      'commitment_due_soon',
      'commitment_overdue',
      'escalation_fired',
      'escalation_escalated',
      'payment_failed',
      'subscription_cancelled',
      'trial_ending',
      'team_invited',
      'weekly_summary'
    )
  ),
  title text not null,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_notifications_user_created_idx
  on public.org_notifications (user_id, created_at desc);

create index if not exists org_notifications_user_unread_idx
  on public.org_notifications (user_id, read)
  where deleted_at is null and read = false;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id text not null,
  type text not null check (
    type in (
      'commitment_assigned',
      'commitment_due_soon',
      'commitment_overdue',
      'escalation_fired',
      'escalation_escalated',
      'payment_failed',
      'subscription_cancelled',
      'trial_ending',
      'team_invited',
      'weekly_summary'
    )
  ),
  in_app boolean not null default true,
  email boolean not null default true,
  slack boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, type)
);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences (org_id, user_id);

alter table public.org_notifications enable row level security;
create policy "deny_all_org_notifications" on public.org_notifications for all using (false);

alter table public.notification_preferences enable row level security;
create policy "deny_all_notification_preferences" on public.notification_preferences for all using (false);
