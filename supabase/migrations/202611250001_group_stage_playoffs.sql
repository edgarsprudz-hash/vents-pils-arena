-- Groups stage support: four entrants per group, round-robin fixtures, then MAIN playoff bracket.
alter table public.tournament_matches
  add column if not exists group_number integer;

alter table public.tournament_matches
  drop constraint if exists tournament_matches_bracket_type_check;

alter table public.tournament_matches
  add constraint tournament_matches_bracket_type_check
  check (bracket_type in ('MAIN','THIRD_PLACE','GROUP'));

create index if not exists tournament_matches_group_idx
  on public.tournament_matches(tournament_id, bracket_type, group_number, match_number);
