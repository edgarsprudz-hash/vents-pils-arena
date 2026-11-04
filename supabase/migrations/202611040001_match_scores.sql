-- VENTSPILS ARENA: match scores for editable tournament results
alter table public.tournament_matches
  add column if not exists score_a integer check (score_a is null or score_a >= 0),
  add column if not exists score_b integer check (score_b is null or score_b >= 0);
