-- Team + organization + chat collaboration primitives.
-- Service-role only access; app APIs enforce permissions.

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('admin', 'manager', 'member')),
  invited_by text,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_org_idx on public.org_members (org_id, status);
create index if not exists org_members_user_idx on public.org_members (user_id, status);

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'member')),
  invited_by text not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by text,
  created_at timestamptz not null default now()
);

create index if not exists org_invitations_org_idx on public.org_invitations (org_id, created_at desc);
create index if not exists org_invitations_email_idx on public.org_invitations (email, accepted_at);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id text not null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  added_by text,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_project_idx on public.project_members (project_id);
create index if not exists project_members_user_idx on public.project_members (user_id);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('direct', 'project')),
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chat_channels_org_idx on public.chat_channels (org_id, created_at desc);
create index if not exists chat_channels_project_idx on public.chat_channels (project_id);

create table if not exists public.chat_channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id text not null,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (channel_id, user_id)
);

create index if not exists chat_channel_members_user_idx on public.chat_channel_members (user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel_type text not null check (channel_type in ('direct', 'project')),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  sender_id text not null,
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);
create index if not exists chat_messages_org_idx on public.chat_messages (org_id, created_at desc);

alter table public.org_members enable row level security;
alter table public.org_invitations enable row level security;
alter table public.project_members enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;

create policy "deny_all_org_members" on public.org_members for all using (false);
create policy "deny_all_org_invitations" on public.org_invitations for all using (false);
create policy "deny_all_project_members" on public.project_members for all using (false);
create policy "deny_all_chat_channels" on public.chat_channels for all using (false);
create policy "deny_all_chat_channel_members" on public.chat_channel_members for all using (false);
create policy "deny_all_chat_messages" on public.chat_messages for all using (false);
