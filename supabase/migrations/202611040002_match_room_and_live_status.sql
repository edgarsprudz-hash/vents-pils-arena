-- VENTSPILS ARENA: match room details and live match status
alter table public.tournament_matches
  add column if not exists cybershoke_url text,
  add column if not exists map_name text;

alter table public.tournament_matches
  drop constraint if exists tournament_matches_status_check;

alter table public.tournament_matches
  add constraint tournament_matches_status_check
  check (status in ('SCHEDULED', 'LIVE', 'COMPLETED'));
