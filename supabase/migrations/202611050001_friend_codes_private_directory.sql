-- Friend codes and private, exact-match player lookup for Ventspils Arena.
-- Existing friend requests and team membership remain unchanged.

alter table public.profiles
  add column if not exists friend_code text;

create or replace function public.assign_arena_friend_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if new.friend_code is null or length(trim(new.friend_code)) = 0 then
    loop
      candidate := upper(substr(md5(gen_random_uuid()::text), 1, 8));
      exit when not exists (
        select 1 from public.profiles p where p.friend_code = candidate
      );
    end loop;
    new.friend_code := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_arena_friend_code on public.profiles;
create trigger profiles_assign_arena_friend_code
before insert or update of friend_code on public.profiles
for each row execute function public.assign_arena_friend_code();

update public.profiles
set friend_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
where friend_code is null or length(trim(friend_code)) = 0;

create unique index if not exists profiles_friend_code_uidx
  on public.profiles(friend_code);

alter table public.profiles
  alter column friend_code set not null;

create or replace function public.get_my_arena_friend_code()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select p.friend_code from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.find_arena_player_by_friend_code(p_code text)
returns table(id uuid, nickname text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nickname, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and p.friend_code = upper(trim(coalesce(p_code, '')))
    and p.id <> auth.uid()
  limit 1;
$$;

create or replace function public.get_arena_player_profiles(p_user_ids uuid[])
returns table(id uuid, nickname text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.nickname, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and (
      p.id = auth.uid()
      or exists (
        select 1 from public.friend_requests f
        where f.status in ('PENDING','ACCEPTED')
          and (
            (f.requester_id = auth.uid() and f.addressee_id = p.id)
            or (f.addressee_id = auth.uid() and f.requester_id = p.id)
          )
      )
      or exists (
        select 1
        from public.arena_team_members mine
        join public.arena_team_members theirs on theirs.team_id = mine.team_id
        where mine.user_id = auth.uid()
          and mine.status in ('ACTIVE','INVITED')
          and theirs.user_id = p.id
          and theirs.status in ('ACTIVE','INVITED')
      )
      or exists (
        select 1 from public.arena_teams t
        join public.arena_team_members m on m.team_id = t.id
        where t.owner_id = auth.uid()
          and m.user_id = p.id
      )
      or exists (
        select 1 from public.arena_teams t
        join public.arena_team_members m on m.team_id = t.id
        where m.user_id = auth.uid()
          and t.owner_id = p.id
      )
    );
$$;

revoke all on function public.assign_arena_friend_code() from public, anon, authenticated;
revoke all on function public.get_my_arena_friend_code() from public, anon;
revoke all on function public.find_arena_player_by_friend_code(text) from public, anon;
revoke all on function public.get_arena_player_profiles(uuid[]) from public, anon;
grant execute on function public.get_my_arena_friend_code() to authenticated;
grant execute on function public.find_arena_player_by_friend_code(text) to authenticated;
grant execute on function public.get_arena_player_profiles(uuid[]) to authenticated;

-- The former view exposed a browseable directory. All discovery now requires an exact friend code.
revoke all on public.player_directory from public, anon, authenticated;
