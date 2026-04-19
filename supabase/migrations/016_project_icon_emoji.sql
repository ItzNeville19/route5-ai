-- Optional emoji / icon label per project (sidebar + dashboard).
alter table public.projects add column if not exists icon_emoji text;
