-- Notion integration: captured pages, watched databases, completion sync log. Service role only.

create table if not exists public.notion_captured_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  notion_page_id text not null,
  notion_database_id text not null,
  title text not null default '',
  content_text text not null default '',
  page_url text,
  created_time timestamptz,
  last_edited_time timestamptz,
  processed boolean not null default false,
  decision_detected boolean not null default false,
  commitment_id uuid references public.org_commitments (id) on delete set null,
  confidence_score double precision,
  decision_text text,
  captured_at timestamptz not null default now(),
  unique (notion_page_id)
);

create index if not exists notion_captured_org_pending_idx
  on public.notion_captured_pages (org_id, processed, decision_detected)
  where processed = false and decision_detected = true;

create index if not exists notion_captured_org_idx on public.notion_captured_pages (org_id, captured_at desc);

create table if not exists public.notion_watched_databases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  notion_database_id text not null,
  database_name text,
  database_url text,
  watching boolean not null default true,
  last_cursor text,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, notion_database_id)
);

create index if not exists notion_watched_org_idx on public.notion_watched_databases (org_id);

create table if not exists public.notion_completed_sync (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  commitment_id uuid not null references public.org_commitments (id) on delete cascade,
  notion_page_id text not null,
  synced_at timestamptz not null default now(),
  sync_status text not null default 'ok'
);

create index if not exists notion_completed_commitment_idx on public.notion_completed_sync (commitment_id);

alter table public.notion_captured_pages enable row level security;
create policy "deny_all_notion_captured_pages" on public.notion_captured_pages for all using (false);

alter table public.notion_watched_databases enable row level security;
create policy "deny_all_notion_watched_databases" on public.notion_watched_databases for all using (false);

alter table public.notion_completed_sync enable row level security;
create policy "deny_all_notion_completed_sync" on public.notion_completed_sync for all using (false);
