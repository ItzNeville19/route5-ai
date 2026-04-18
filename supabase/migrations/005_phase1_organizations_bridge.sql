-- Phase 1: one organization per Clerk user (bridge only; Clerk remains source of truth for auth).
-- Adds nullable org_id on projects for future multi-tenant features without breaking existing rows.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  name text not null default 'Workspace',
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_clerk_user_id_idx on public.organizations (clerk_user_id);

alter table public.projects
  add column if not exists org_id uuid references public.organizations (id) on delete set null;

create index if not exists projects_org_id_idx on public.projects (org_id);

alter table public.organizations enable row level security;

create policy "deny_all_organizations" on public.organizations for all using (false);
