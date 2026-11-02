-- Enforce the roster limit selected for each tournament (2v2, 3v3, 5v5)
drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'REGISTERED'
  and length(trim(coalesce(team_name,''))) between 2 and 40
  and jsonb_typeof(roster) = 'array'
  and jsonb_array_length(roster) between 1 and coalesce((
    select case
      when lower(t.format) like '2v2%' then 2
      when lower(t.format) like '3v3%' then 3
      else 5
    end
    from public.tournaments t
    where t.id = tournament_registrations.tournament_id
  ), 5)
);
