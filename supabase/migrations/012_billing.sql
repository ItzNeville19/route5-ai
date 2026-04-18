-- Phase 11: Stripe billing, subscriptions, invoices, usage. Service role only.

create table if not exists public.org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('free', 'starter', 'growth', 'enterprise')),
  status text not null check (status in ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  trial_end timestamptz,
  seat_count integer not null default 1,
  payment_failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_subscriptions_stripe_customer_idx on public.org_subscriptions (stripe_customer_id);
create index if not exists org_subscriptions_stripe_sub_idx on public.org_subscriptions (stripe_subscription_id);

create table if not exists public.org_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  stripe_invoice_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null check (status in ('paid', 'open', 'void', 'uncollectible')),
  invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_invoices_org_idx on public.org_invoices (org_id, created_at desc);

create table if not exists public.org_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  metric text not null check (metric in ('seats', 'commitments', 'integrations')),
  value integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists org_usage_org_metric_idx on public.org_usage (org_id, metric, recorded_at desc);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.org_subscriptions enable row level security;
create policy "deny_all_org_subscriptions" on public.org_subscriptions for all using (false);

alter table public.org_invoices enable row level security;
create policy "deny_all_org_invoices" on public.org_invoices for all using (false);

alter table public.org_usage enable row level security;
create policy "deny_all_org_usage" on public.org_usage for all using (false);

alter table public.stripe_webhook_events enable row level security;
create policy "deny_all_stripe_webhook_events" on public.stripe_webhook_events for all using (false);
