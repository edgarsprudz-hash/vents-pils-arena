-- VENTSPILS ARENA: CS2 + Clash Royale game-aware tournaments and registrations.
-- Existing CS2 tournaments and registration rows remain intact.

create or replace function public.enforce_tournament_game_format()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.game = 'Clash Royale' then
    new.format := '1v1';
  elsif new.game = 'CS2' then
    if new.format not in ('2v2', '3v3', '5v5') then
      new.format := '5v5';
    end if;
  else
    raise exception 'Unsupported tournament game. Choose CS2 or Clash Royale.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_tournament_game_format on public.tournaments;
create trigger enforce_tournament_game_format
before insert or update of game, format on public.tournaments
for each row execute function public.enforce_tournament_game_format();

-- Enforce the correct registration requirements on the database, not only in the UI.
create or replace function public.verify_tournament_captain_steam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_game text;
  linked_steam_id text;
  captain_steam_id text;
  captain_steam_url text;
  roster_count integer;
  captain_nickname text;
  captain_cr_tag text;
begin
  select t.game into tournament_game
  from public.tournaments t
  where t.id = new.tournament_id;

  if tournament_game is null then
    raise exception 'Tournament not found.';
  end if;

  roster_count := jsonb_array_length(coalesce(new.roster, '[]'::jsonb));

  if tournament_game = 'Clash Royale' then
    if roster_count <> 1 then
      raise exception 'Clash Royale tournaments require exactly one player (1v1).';
    end if;

    select
      player.value->>'nickname',
      upper(trim(coalesce(player.value->>'clashRoyaleTag', '')))
    into captain_nickname, captain_cr_tag
    from jsonb_array_elements(new.roster) as player(value)
    limit 1;

    if trim(coalesce(new.captain_name, '')) = ''
       or lower(trim(new.captain_name)) <> lower(trim(coalesce(captain_nickname, ''))) then
      raise exception 'The registered Clash Royale player must be the captain.';
    end if;

    if captain_cr_tag !~ '^#[A-Z0-9]{3,15}$' then
      raise exception 'A valid Clash Royale player tag is required (example: #ABC123).';
    end if;

    return new;
  end if;

  if tournament_game <> 'CS2' then
    raise exception 'Unsupported tournament game.';
  end if;

  select p.steam_id into linked_steam_id
  from public.profiles p
  where p.id = new.user_id;

  if linked_steam_id is null then
    raise exception 'Link your Steam account in your personal cabinet before registering a CS2 team.';
  end if;

  select player.value->>'steamId64', player.value->>'steam'
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
before insert or update of tournament_id, user_id, captain_name, roster
on public.tournament_registrations
for each row execute function public.verify_tournament_captain_steam();

-- Recreate the player insert policy: registrations are submitted as PENDING.
drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'PENDING'
  and length(trim(coalesce(team_name, ''))) between 2 and 40
  and jsonb_typeof(roster) = 'array'
  and (
    (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_registrations.tournament_id
          and t.game = 'CS2'
          and jsonb_array_length(roster) between 1 and
            case
              when t.format = '2v2' then 2
              when t.format = '3v3' then 3
              else 5
            end
      )
    )
    or
    (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_registrations.tournament_id
          and t.game = 'Clash Royale'
          and t.format = '1v1'
          and jsonb_array_length(roster) = 1
          and coalesce(roster->0->>'clashRoyaleTag', '') ~ '^#[A-Z0-9]{3,15}$'
      )
    )
  )
);
