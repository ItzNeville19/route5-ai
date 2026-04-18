-- Soft-archive commitments (audit retention), escalation events, optional OAuth tokens (server-only).

alter table public.commitments
  add column if not exists archived_at timestamptz;

create index if not exists commitments_archived_at_idx on public.commitments (archived_at)
  where archived_at is null;

comment on column public.commitments.archived_at is 'When set, hidden from active Desk/Overview but retained for audit history.';

create table if not exists public.escalation_events (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  commitment_id uuid not null references public.commitments (id) on delete cascade,
  reason text not null,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create index if not exists escalation_events_clerk_idx on public.escalation_events (clerk_user_id, created_at desc);

alter table public.escalation_events enable row level security;
create policy "deny_all_escalation_events" on public.escalation_events for all using (false);

-- Slack OAuth bot token storage (service role only — never expose to client)
create table if not exists public.integration_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  provider text not null,
  access_token text,
  refresh_token text,
  team_id text,
  team_name text,
  bot_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, provider)
);

create index if not exists integration_oauth_clerk_idx on public.integration_oauth_connections (clerk_user_id);

alter table public.integration_oauth_connections enable row level security;
create policy "deny_all_integration_oauth" on public.integration_oauth_connections for all using (false);
