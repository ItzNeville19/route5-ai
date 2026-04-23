-- Per-organization UI policy (which main areas non-admins can open). Admins always have full access.
-- JSON: { "nav": { "desk": false, ... } }; omitted nav keys default to true.

alter table public.organizations
  add column if not exists ui_policy jsonb;
