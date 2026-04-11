-- Run in Supabase SQL Editor (or via supabase db push) before using the app.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  clerk_user_id text not null,
  raw_input text not null,
  summary text not null default '',
  decisions jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_clerk_user_id_idx on public.projects (clerk_user_id);
create index if not exists extractions_project_id_idx on public.extractions (project_id);
create index if not exists extractions_created_at_idx on public.extractions (created_at desc);

alter table public.projects enable row level security;
alter table public.extractions enable row level security;

-- Server uses service role and bypasses RLS; these policies protect direct anon access if the publishable key is used from the client later.
create policy "deny_all_projects" on public.projects for all using (false);
create policy "deny_all_extractions" on public.extractions for all using (false);
