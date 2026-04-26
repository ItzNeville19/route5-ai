-- Route5 MVP unification: canonical commitments contract for Home + Desk.
-- Keeps legacy columns for compatibility while introducing the canonical fields
-- required by the product spec.

begin;

-- Canonical columns
alter table public.commitments
  add column if not exists owner text,
  add column if not exists updated_at timestamptz;

-- Backfill canonical values from legacy execution-layer fields.
update public.commitments
set owner = nullif(trim(coalesce(owner, owner_display_name, owner_user_id, '')), '')
where owner is null;

update public.commitments
set updated_at = coalesce(updated_at, last_updated_at, created_at, now())
where updated_at is null;

-- Normalize status to canonical MVP values.
update public.commitments
set status = case
  when status = 'completed' then 'done'
  when status in ('active', 'not_started') then 'pending'
  when status in ('in_progress', 'on_track', 'at_risk', 'overdue') then 'in_progress'
  when status in ('pending', 'done') then status
  else 'pending'
end;

-- Tighten constraints for canonical contract.
alter table public.commitments
  alter column title set not null,
  alter column status set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'commitments_status_check'
      and conrelid = 'public.commitments'::regclass
  ) then
    alter table public.commitments drop constraint commitments_status_check;
  end if;
end $$;

alter table public.commitments
  add constraint commitments_status_check
  check (status in ('pending', 'in_progress', 'done'));

create index if not exists commitments_status_idx on public.commitments (status);
create index if not exists commitments_due_date_idx on public.commitments (due_date);
create index if not exists commitments_updated_at_idx on public.commitments (updated_at desc);
create index if not exists commitments_owner_idx on public.commitments (owner);

commit;
