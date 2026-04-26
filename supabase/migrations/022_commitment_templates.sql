begin;

create table if not exists public.commitment_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null references public.organizations(id) on delete cascade,
  created_by text not null,
  title text not null,
  description text null,
  default_owner text null,
  due_days_offset integer not null default 3 check (due_days_offset >= 0 and due_days_offset <= 365),
  completion_expectations text null,
  source text not null default 'manual' check (source in ('meeting', 'email', 'slack', 'manual')),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commitment_templates_org_idx
  on public.commitment_templates (org_id, updated_at desc)
  where archived_at is null;

insert into public.commitment_templates
  (org_id, created_by, title, description, default_owner, due_days_offset, completion_expectations, source)
values
  (null, 'route5-system', 'Weekly team follow-up', 'Weekly accountability check-in with updates and owners.', null, 2, 'Include progress summary, blockers, and next action.', 'manual'),
  (null, 'route5-system', 'Client deliverable', 'Track external commitment with explicit delivery proof.', null, 5, 'Attach final artifact link and delivery confirmation.', 'email'),
  (null, 'route5-system', 'Hiring next step', 'Move candidate process forward with clear owner.', null, 2, 'Add interview outcome and next scheduled step.', 'meeting'),
  (null, 'route5-system', 'Meeting action item', 'Convert key meeting decision into accountable execution.', null, 1, 'Add resolution note and reference decision context.', 'meeting'),
  (null, 'route5-system', 'Operations handoff', 'Coordinate a clean operational handoff between teams.', null, 3, 'Document handoff checklist completion and receiving owner sign-off.', 'manual'),
  (null, 'route5-system', 'Sales follow-up', 'Ensure high-value sales follow-up is executed on time.', null, 1, 'Add outreach proof and customer response state.', 'email'),
  (null, 'route5-system', 'Executive review item', 'Prepare and complete executive review deliverable.', null, 4, 'Attach review memo and decision summary.', 'manual')
on conflict do nothing;

commit;
