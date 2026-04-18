-- Phase 6 — Org-level commitment tracker (Clerk + organizations from Phase 1).
-- NOTE: The legacy execution-layer table `public.commitments` (project-scoped) is unchanged.
-- This migration adds parallel tables prefixed org_* for the org-wide tracker.

create table if not exists public.org_commitments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  owner_id text not null,
  deadline timestamptz not null,
  priority text not null
    check (priority in ('critical', 'high', 'medium', 'low')),
  status text not null
    check (status in ('not_started', 'in_progress', 'on_track', 'at_risk', 'overdue', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists org_commitments_org_id_idx on public.org_commitments (org_id)
  where deleted_at is null;
create index if not exists org_commitments_owner_idx on public.org_commitments (owner_id)
  where deleted_at is null;
create index if not exists org_commitments_deadline_idx on public.org_commitments (deadline)
  where deleted_at is null;
create index if not exists org_commitments_status_idx on public.org_commitments (status)
  where deleted_at is null;

create table if not exists public.org_commitment_comments (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  user_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists org_commitment_comments_commitment_idx
  on public.org_commitment_comments (commitment_id, created_at desc);

create table if not exists public.org_commitment_attachments (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  user_id text not null,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists org_commitment_attachments_commitment_idx
  on public.org_commitment_attachments (commitment_id);

create table if not exists public.org_commitment_history (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  changed_by text not null,
  field_changed text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create index if not exists org_commitment_history_commitment_idx
  on public.org_commitment_history (commitment_id, changed_at desc);

create table if not exists public.org_commitment_dependencies (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  depends_on_commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  unique (commitment_id, depends_on_commitment_id),
  check (commitment_id <> depends_on_commitment_id)
);

create index if not exists org_commitment_deps_depends_idx
  on public.org_commitment_dependencies (depends_on_commitment_id);

alter table public.org_commitments enable row level security;
alter table public.org_commitment_comments enable row level security;
alter table public.org_commitment_attachments enable row level security;
alter table public.org_commitment_history enable row level security;
alter table public.org_commitment_dependencies enable row level security;

create policy "deny_all_org_commitments" on public.org_commitments for all using (false);
create policy "deny_all_org_commitment_comments" on public.org_commitment_comments for all using (false);
create policy "deny_all_org_commitment_attachments" on public.org_commitment_attachments for all using (false);
create policy "deny_all_org_commitment_history" on public.org_commitment_history for all using (false);
create policy "deny_all_org_commitment_dependencies" on public.org_commitment_dependencies for all using (false);

-- Auto status rules (mirrored in src/lib/org-commitments/status.ts for SQLite).
create or replace function public.recompute_org_commitment_status(p_id uuid)
returns text
language plpgsql
as $$
declare
  r public.org_commitments%rowtype;
  v_now timestamptz := now();
  v_status text;
begin
  select * into r
  from public.org_commitments
  where id = p_id and deleted_at is null;
  if not found then
    return null;
  end if;

  if r.completed_at is not null then
    v_status := 'completed';
  elsif r.deadline < v_now then
    v_status := 'overdue';
  elsif r.deadline <= v_now + interval '72 hours'
        and r.last_activity_at < v_now - interval '48 hours' then
    v_status := 'at_risk';
  elsif r.deadline > v_now + interval '7 days' then
    v_status := 'on_track';
  else
    v_status := 'in_progress';
  end if;

  if v_status is distinct from r.status then
    update public.org_commitments
    set status = v_status,
        updated_at = v_now
    where id = p_id;
  end if;

  return v_status;
end;
$$;

-- Optional: schedule in Supabase (pg_cron) — e.g. every 15 minutes:
-- select cron.schedule(
--   'recompute-org-commitment-status',
--   '*/15 * * * *',
--   $$select public.recompute_org_commitment_status(id) from public.org_commitments where deleted_at is null$$
-- );

-- Storage bucket for attachment binaries (uploads use service role from API routes).
insert into storage.buckets (id, name, public)
values ('commitment-attachments', 'commitment-attachments', false)
on conflict (id) do nothing;
