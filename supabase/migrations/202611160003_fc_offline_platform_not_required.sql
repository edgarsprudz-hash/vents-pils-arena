-- EA SPORTS FC is an offline event; platform must not be collected or required.
create or replace function public.verify_tournament_captain_steam()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tournament_game text;
  linked_steam_id text;
  captain_steam_id text;
  captain_steam_url text;
  roster_count integer;
  captain_nickname text;
  captain_cr_tag text;
begin
  select game into tournament_game from public.tournaments where id = new.tournament_id;
  if tournament_game is null then raise exception 'Tournament not found.'; end if;
  roster_count := jsonb_array_length(coalesce(new.roster, '[]'::jsonb));

  if tournament_game = 'EA SPORTS FC' then
    if roster_count <> 1 then raise exception 'EA SPORTS FC is an individual 1v1 tournament.'; end if;
    if length(trim(coalesce(new.contact_name,''))) < 2
      or length(trim(coalesce(new.contact_surname,''))) < 2
      or length(trim(coalesce(new.contact_phone,''))) < 5
      or position('@' in coalesce(new.contact_email,'')) < 2
    then raise exception 'Complete the required contact details.'; end if;
    return new;
  end if;

  if tournament_game = 'Clash Royale' then
    if roster_count <> 1 then raise exception 'Clash Royale tournaments require exactly one player (1v1).'; end if;
    select player.value->>'nickname', upper(trim(coalesce(player.value->>'clashRoyaleTag','')))
      into captain_nickname,captain_cr_tag
      from jsonb_array_elements(new.roster) as player(value) limit 1;
    if trim(coalesce(new.captain_name,'')) = '' or lower(trim(new.captain_name)) <> lower(trim(coalesce(captain_nickname,''))) then raise exception 'The registered Clash Royale player must be the captain.'; end if;
    if captain_cr_tag !~ '^#[A-Z0-9]{3,15}$' then raise exception 'A valid Clash Royale player tag is required.'; end if;
    return new;
  end if;

  if tournament_game <> 'CS2' then raise exception 'Unsupported tournament game.'; end if;
  select steam_id into linked_steam_id from public.profiles where id = new.user_id;
  if linked_steam_id is null then raise exception 'Link your Steam account first.'; end if;
  select player.value->>'steamId64',player.value->>'steam'
    into captain_steam_id,captain_steam_url
    from jsonb_array_elements(coalesce(new.roster,'[]'::jsonb)) as player(value)
    where lower(trim(coalesce(player.value->>'nickname',''))) = lower(trim(coalesce(new.captain_name,''))) limit 1;
  if captain_steam_id is null or captain_steam_id <> linked_steam_id
    or captain_steam_url <> 'https://steamcommunity.com/profiles/' || linked_steam_id || '/' then
    raise exception 'The captain Steam profile must match the linked account.';
  end if;
  return new;
end; $$;

drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated with check (
  user_id = auth.uid() and status = 'PENDING'
  and length(trim(coalesce(team_name,''))) between 2 and 40
  and jsonb_typeof(roster) = 'array'
  and (
    exists (select 1 from public.tournaments t where t.id=tournament_id and t.game='CS2'
      and jsonb_array_length(roster) between 1 and case when t.format='2v2' then 2 when t.format='3v3' then 3 else 5 end)
    or exists (select 1 from public.tournaments t where t.id=tournament_id and t.game='Clash Royale'
      and t.format='1v1' and jsonb_array_length(roster)=1 and coalesce(roster->0->>'clashRoyaleTag','') ~ '^#[A-Z0-9]{3,15}$')
    or exists (select 1 from public.tournaments t where t.id=tournament_id and t.game='EA SPORTS FC'
      and t.format='1v1' and jsonb_array_length(roster)=1
      and length(trim(coalesce(contact_name,'')))>=2 and length(trim(coalesce(contact_surname,'')))>=2
      and length(trim(coalesce(contact_phone,'')))>=5 and length(trim(coalesce(contact_email,'')))>=5
      and payment_status='UNPAID')
  )
);
