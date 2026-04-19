-- Public marketing / product email list (footer & landing). Service role inserts only.

create table if not exists public.marketing_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

create unique index if not exists marketing_email_subscribers_email_lower_idx
  on public.marketing_email_subscribers (lower(email));

create index if not exists marketing_email_subscribers_created_idx
  on public.marketing_email_subscribers (created_at desc);

alter table public.marketing_email_subscribers enable row level security;

drop policy if exists "deny_all_marketing_email_subscribers" on public.marketing_email_subscribers;
create policy "deny_all_marketing_email_subscribers" on public.marketing_email_subscribers for all using (false);
