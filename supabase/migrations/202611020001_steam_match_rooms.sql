alter table public.profiles add column if not exists steam_id text unique;
alter table public.profiles add column if not exists steam_linked_at timestamptz;
create table if not exists public.tournament_players (
 id uuid primary key default gen_random_uuid(),tournament_id uuid not null references public.tournaments(id) on delete cascade,
 registration_id uuid not null references public.tournament_registrations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 steam_id text not null,player_nickname text not null,created_at timestamptz not null default now(),unique(tournament_id,user_id),unique(tournament_id,steam_id));
create index if not exists tournament_players_user_idx on public.tournament_players(user_id,tournament_id);
alter table public.tournament_matches add column if not exists cybershoke_url text;
alter table public.tournament_matches add column if not exists map_name text;
alter table public.tournament_matches add column if not exists scheduled_at timestamptz;
alter table public.tournament_players enable row level security;
drop policy if exists "players read own tournament memberships" on public.tournament_players;
create policy "players read own tournament memberships" on public.tournament_players for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
create or replace function public.sync_approved_tournament_players() returns trigger language plpgsql security definer set search_path=public as $$
declare entry jsonb;sid text;prof record;
begin
 if new.status='REGISTERED' and (tg_op='INSERT' or old.status is distinct from new.status or old.roster is distinct from new.roster) then
  delete from public.tournament_players where registration_id=new.id;
  for entry in select value from jsonb_array_elements(coalesce(new.roster,'[]'::jsonb)) loop
   sid:=nullif(entry->>'steam','');
   if sid ~ '^https?://steamcommunity\.com/profiles/[0-9]{17}/?$' then sid:=substring(sid from '([0-9]{17})/?$');end if;
   if sid ~ '^[0-9]{17}$' then
    select id into prof from public.profiles where steam_id=sid limit 1;
    if prof.id is not null then insert into public.tournament_players(tournament_id,registration_id,user_id,steam_id,player_nickname) values(new.tournament_id,new.id,prof.id,sid,coalesce(entry->>'nickname','Player')) on conflict(tournament_id,user_id) do update set registration_id=excluded.registration_id,steam_id=excluded.steam_id,player_nickname=excluded.player_nickname;end if;
   end if;
  end loop;
 elsif tg_op='UPDATE' and old.status='REGISTERED' and new.status<>'REGISTERED' then delete from public.tournament_players where registration_id=new.id;
 end if;return new;end $$;
drop trigger if exists sync_approved_tournament_players on public.tournament_registrations;
create trigger sync_approved_tournament_players after insert or update of status,roster on public.tournament_registrations for each row execute function public.sync_approved_tournament_players();
alter table public.tournament_matches enable row level security;
drop policy if exists "participants and admins read tournament matches" on public.tournament_matches;
create policy "participants and admins read tournament matches" on public.tournament_matches for select to authenticated using(exists(select 1 from public.tournament_players tp where tp.tournament_id=tournament_matches.tournament_id and tp.user_id=auth.uid()) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
