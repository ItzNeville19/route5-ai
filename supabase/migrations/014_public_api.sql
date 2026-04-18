-- Phase 14: Public API keys, outbound webhooks, delivery log. Service role only.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  scopes jsonb not null default '["read"]'::jsonb,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked boolean not null default false,
  revoked_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists api_keys_hash_unique on public.api_keys (key_hash);
create index if not exists api_keys_org_idx on public.api_keys (org_id);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  url text not null,
  description text,
  secret text not null,
  events jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_endpoints_org_idx on public.webhook_endpoints (org_id);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  webhook_endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  response_status int,
  response_body text,
  attempt_count int not null default 0,
  delivered_at timestamptz,
  failed_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_endpoint_idx
  on public.webhook_deliveries (webhook_endpoint_id, created_at desc);
create index if not exists webhook_deliveries_retry_idx
  on public.webhook_deliveries (next_retry_at)
  where failed_at is null and delivered_at is null;

alter table public.api_keys enable row level security;
create policy "deny_all_api_keys" on public.api_keys for all using (false);

alter table public.webhook_endpoints enable row level security;
create policy "deny_all_webhook_endpoints" on public.webhook_endpoints for all using (false);

alter table public.webhook_deliveries enable row level security;
create policy "deny_all_webhook_deliveries" on public.webhook_deliveries for all using (false);
