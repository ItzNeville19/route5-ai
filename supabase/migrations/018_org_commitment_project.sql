-- Optional project link for org-level commitments (Feed project pill + selector).

alter table public.org_commitments
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists org_commitments_project_id_idx on public.org_commitments (project_id)
  where deleted_at is null;
