-- Gmail integration: captured emails + watch state. Service role only.

create table if not exists public.gmail_captured_emails (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  from_email text not null,
  from_name text,
  subject text not null default '',
  body_text text not null default '',
  received_at timestamptz not null,
  processed boolean not null default false,
  decision_detected boolean not null default false,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  confidence_score double precision,
  decision_text text,
  captured_at timestamptz not null default now(),
  unique (gmail_message_id)
);

create index if not exists gmail_captured_org_pending_idx
  on public.gmail_captured_emails (org_id, processed, decision_detected)
  where processed = false and decision_detected = true;

create index if not exists gmail_captured_org_idx on public.gmail_captured_emails (org_id, captured_at desc);

create table if not exists public.gmail_watch (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  history_id text not null,
  expiration timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

alter table public.gmail_captured_emails enable row level security;
create policy "deny_all_gmail_captured_emails" on public.gmail_captured_emails for all using (false);

alter table public.gmail_watch enable row level security;
create policy "deny_all_gmail_watch" on public.gmail_watch for all using (false);
