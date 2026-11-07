-- Ensure the registered captain uses the same Steam identity linked to their arena account.
create or replace function public.verify_tournament_captain_steam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_steam_id text;
  captain_steam_id text;
  captain_steam_url text;
begin
  select p.steam_id into linked_steam_id
  from public.profiles p
  where p.id = new.user_id;

  if linked_steam_id is null then
    raise exception 'Link your Steam account in your personal cabinet before registering a team.';
  end if;

  select
    player.value->>'steamId64',
    player.value->>'steam'
  into captain_steam_id, captain_steam_url
  from jsonb_array_elements(coalesce(new.roster, '[]'::jsonb)) as player(value)
  where lower(trim(coalesce(player.value->>'nickname', ''))) = lower(trim(coalesce(new.captain_name, '')))
  limit 1;

  if captain_steam_id is null
     or captain_steam_id <> linked_steam_id
     or captain_steam_url <> 'https://steamcommunity.com/profiles/' || linked_steam_id || '/' then
    raise exception 'The captain Steam profile must match the Steam account linked to the VENTSPILS ARENA account.';
  end if;

  return new;
end;
$$;

drop trigger if exists verify_tournament_captain_steam on public.tournament_registrations;
create trigger verify_tournament_captain_steam
before insert or update of user_id, captain_name, roster
on public.tournament_registrations
for each row
execute function public.verify_tournament_captain_steam();
