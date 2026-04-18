-- Commitments: system of record for execution tracking (owner, status, due date, activity).
-- Apply after 001_route5_mvp.sql.

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  clerk_user_id text not null,
  title text not null,
  description text,
  owner_user_id text,
  owner_display_name text,
  source text not null,
  source_reference text not null default '',
  status text not null,
  priority text not null,
  created_at timestamptz not null default now(),
  due_date timestamptz,
  last_updated_at timestamptz not null default now(),
  activity_log jsonb not null default '[]'::jsonb
);

create index if not exists commitments_clerk_user_id_idx on public.commitments (clerk_user_id);
create index if not exists commitments_project_id_idx on public.commitments (project_id);
create index if not exists commitments_last_updated_idx on public.commitments (last_updated_at desc);

alter table public.commitments enable row level security;

create policy "deny_all_commitments" on public.commitments for all using (false);
