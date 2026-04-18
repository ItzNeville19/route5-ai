-- Phase 4 — Org integrations (Slack OAuth + captured messages). Service role only.

create table if not exists public.org_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  type text not null
    check (type in ('slack', 'gmail', 'notion', 'zoom', 'teams', 'calendar')),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  team_id text,
  team_name text,
  bot_user_id text,
  webhook_url text,
  scope text,
  status text not null
    check (status in ('connected', 'disconnected', 'error')),
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, type)
);

create index if not exists org_integrations_org_idx on public.org_integrations (org_id);

create table if not exists public.slack_captured_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  slack_team_id text not null,
  slack_channel_id text not null,
  slack_message_ts text not null,
  slack_user_id text,
  content text not null,
  processed boolean not null default false,
  decision_detected boolean not null default false,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  captured_at timestamptz not null default now(),
  confidence_score double precision,
  decision_text text,
  unique (slack_team_id, slack_channel_id, slack_message_ts)
);

create index if not exists slack_captured_org_pending_idx
  on public.slack_captured_messages (org_id, processed, decision_detected)
  where processed = false and decision_detected = true;

alter table public.org_integrations enable row level security;
create policy "deny_all_org_integrations" on public.org_integrations for all using (false);

alter table public.slack_captured_messages enable row level security;
create policy "deny_all_slack_captured_messages" on public.slack_captured_messages for all using (false);
