-- Per-user message hides ("delete for you") — message remains for other channel members.
create table if not exists public.chat_message_hides (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists chat_message_hides_user_idx on public.chat_message_hides (user_id);

alter table public.chat_message_hides enable row level security;

create policy "deny_all_chat_message_hides" on public.chat_message_hides for all using (false);
