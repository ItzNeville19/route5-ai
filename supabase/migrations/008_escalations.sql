-- Phase 7 — Org commitment escalation engine (separate from legacy project escalation_events).

create table if not exists public.org_escalations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  severity text not null
    check (severity in ('warning', 'urgent', 'critical', 'overdue')),
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  resolution_notes text,
  snoozed_until timestamptz,
  snooze_reason text,
  notified_owner_at timestamptz,
  notified_manager_at timestamptz,
  notified_admin_at timestamptz,
  notified_all_admins_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_escalations_org_idx on public.org_escalations (org_id, triggered_at desc);
create index if not exists org_escalations_commitment_idx on public.org_escalations (commitment_id);
create index if not exists org_escalations_open_idx on public.org_escalations (org_id)
  where resolved_at is null;

alter table public.org_escalations enable row level security;

create policy "deny_all_org_escalations" on public.org_escalations for all using (false);
