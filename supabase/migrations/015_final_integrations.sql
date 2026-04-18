-- Phase final: Zoom, Meet, Teams capture, calendar deadline links, onboarding progress.

alter table public.organizations
  add column if not exists primary_use_case text;

create table if not exists public.zoom_meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  zoom_meeting_id text not null unique,
  zoom_user_id text,
  topic text,
  start_time timestamptz,
  end_time timestamptz,
  transcript_fetched boolean not null default false,
  transcript_text text,
  processed boolean not null default false,
  needs_review boolean not null default false,
  confidence_score double precision,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists zoom_meetings_org_idx on public.zoom_meetings (org_id, created_at desc);

create table if not exists public.gmeet_meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  google_event_id text not null unique,
  google_calendar_id text,
  summary text,
  start_time timestamptz,
  end_time timestamptz,
  transcript_fetched boolean not null default false,
  transcript_text text,
  processed boolean not null default false,
  needs_review boolean not null default false,
  confidence_score double precision,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gmeet_meetings_org_idx on public.gmeet_meetings (org_id, created_at desc);

create table if not exists public.teams_captured_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  teams_message_id text not null unique,
  teams_channel_id text not null,
  teams_team_id text not null,
  from_user_id text,
  from_display_name text,
  content text not null,
  received_at timestamptz not null,
  processed boolean not null default false,
  decision_detected boolean not null default false,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  confidence_score double precision,
  captured_at timestamptz not null default now()
);

create index if not exists teams_captured_org_idx on public.teams_captured_messages (org_id, captured_at desc);

create table if not exists public.calendar_deadline_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  provider text not null check (provider in ('google', 'outlook')),
  calendar_event_id text not null,
  reminder_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commitment_id, provider)
);

create index if not exists calendar_deadline_org_idx on public.calendar_deadline_events (org_id);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id text not null,
  step text not null
    check (step in ('org_setup', 'invite_team', 'connect_integration', 'first_commitment', 'complete')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, user_id, step)
);

create index if not exists onboarding_progress_user_idx on public.onboarding_progress (org_id, user_id);

alter table public.zoom_meetings enable row level security;
create policy "deny_all_zoom_meetings" on public.zoom_meetings for all using (false);

alter table public.gmeet_meetings enable row level security;
create policy "deny_all_gmeet_meetings" on public.gmeet_meetings for all using (false);

alter table public.teams_captured_messages enable row level security;
create policy "deny_all_teams_captured" on public.teams_captured_messages for all using (false);

alter table public.calendar_deadline_events enable row level security;
create policy "deny_all_calendar_deadline" on public.calendar_deadline_events for all using (false);

alter table public.onboarding_progress enable row level security;
create policy "deny_all_onboarding_progress" on public.onboarding_progress for all using (false);
