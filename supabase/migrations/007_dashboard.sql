-- Phase 8 — Executive dashboard: daily execution snapshots for trend charts.

create table if not exists public.execution_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  health_score numeric(6, 2) not null,
  active_count integer not null default 0,
  on_track_count integer not null default 0,
  at_risk_count integer not null default 0,
  overdue_count integer not null default 0,
  completed_week_count integer not null default 0,
  completed_month_count integer not null default 0,
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  unique (org_id, snapshot_date)
);

create index if not exists execution_snapshots_org_date_idx
  on public.execution_snapshots (org_id, snapshot_date desc);

alter table public.execution_snapshots enable row level security;

create policy "deny_all_execution_snapshots" on public.execution_snapshots for all using (false);

create or replace function public.compute_execution_snapshot(p_org_id uuid)
returns void
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_start_30d timestamptz := v_now - interval '30 days';
  v_due_total int;
  v_on_time int;
  v_health numeric;
  v_active int;
  v_on_track int;
  v_at_risk int;
  v_overdue int;
  v_week int;
  v_month int;
  v_day date := (v_now at time zone 'utc')::date;
begin
  select count(*)::int into v_due_total
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and deadline >= v_start_30d
    and deadline <= v_now;

  select count(*)::int into v_on_time
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and deadline >= v_start_30d
    and deadline <= v_now
    and completed_at is not null
    and completed_at <= deadline;

  if v_due_total = 0 then
    v_health := 100;
  else
    v_health := round((v_on_time::numeric / v_due_total::numeric) * 100);
  end if;

  select count(*)::int into v_active
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is null;

  select count(*)::int into v_on_track
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is null
    and status = 'on_track';

  select count(*)::int into v_at_risk
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is null
    and status = 'at_risk';

  select count(*)::int into v_overdue
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is null
    and status = 'overdue';

  select count(*)::int into v_week
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is not null
    and completed_at >= date_trunc('week', v_now at time zone 'utc')
    and completed_at < date_trunc('week', v_now at time zone 'utc') + interval '1 week';

  select count(*)::int into v_month
  from public.org_commitments
  where org_id = p_org_id
    and deleted_at is null
    and completed_at is not null
    and completed_at >= date_trunc('month', v_now at time zone 'utc')
    and completed_at < date_trunc('month', v_now at time zone 'utc') + interval '1 month';

  insert into public.execution_snapshots (
    org_id,
    health_score,
    active_count,
    on_track_count,
    at_risk_count,
    overdue_count,
    completed_week_count,
    completed_month_count,
    snapshot_date
  )
  values (
    p_org_id,
    v_health,
    v_active,
    v_on_track,
    v_at_risk,
    v_overdue,
    v_week,
    v_month,
    v_day
  )
  on conflict (org_id, snapshot_date) do update set
    health_score = excluded.health_score,
    active_count = excluded.active_count,
    on_track_count = excluded.on_track_count,
    at_risk_count = excluded.at_risk_count,
    overdue_count = excluded.overdue_count,
    completed_week_count = excluded.completed_week_count,
    completed_month_count = excluded.completed_month_count,
    created_at = now();
end;
$$;
