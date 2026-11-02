-- Reverse awarded competitive points if an administrator removes a tournament result
create or replace function public.reverse_tournament_result_points() returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.team_points set
  points=greatest(0,points-old.points),
  tournaments_played=greatest(0,tournaments_played-1),
  wins=greatest(0,wins-case when old.place=1 then 1 else 0 end),
  podiums=greatest(0,podiums-case when old.place<=3 then 1 else 0 end),
  updated_at=now()
 where team_name=old.team_name;
 return old;
end; $$;
drop trigger if exists tournament_result_reverse_points on public.tournament_results;
create trigger tournament_result_reverse_points after delete on public.tournament_results for each row execute function public.reverse_tournament_result_points();
