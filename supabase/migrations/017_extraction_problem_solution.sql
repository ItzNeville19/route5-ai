-- Optional: adds structured problem/solution framing to extractions (Route5 execution layer).
alter table public.extractions
  add column if not exists problem text not null default '';

alter table public.extractions
  add column if not exists solution text not null default '';

alter table public.extractions
  add column if not exists open_questions jsonb not null default '[]'::jsonb;
