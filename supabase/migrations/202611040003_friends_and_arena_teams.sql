-- VENTSPILS ARENA: player friendships and reusable community teams
create or replace view public.player_directory as
select id, nickname, display_name, steam_id
from public.profiles
where nickname is not null and length(trim(nickname)) > 0;
revoke all on public.player_directory from anon;
grant select on public.player_directory to authenticated;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friend_requests_pair_uidx
  on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friend_requests_addressee_status_idx on public.friend_requests(addressee_id,status);
alter table public.friend_requests enable row level security;
drop policy if exists "Players can view their friend requests" on public.friend_requests;
create policy "Players can view their friend requests" on public.friend_requests
for select to authenticated using (auth.uid() in (requester_id,addressee_id));
drop policy if exists "Players can send friend requests" on public.friend_requests;
create policy "Players can send friend requests" on public.friend_requests
for insert to authenticated with check (requester_id=auth.uid() and addressee_id<>auth.uid());
drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests" on public.friend_requests
for update to authenticated using (addressee_id=auth.uid() and status='PENDING')
with check (addressee_id=auth.uid() and status in ('ACCEPTED','REJECTED'));
drop policy if exists "Players can remove their friend requests" on public.friend_requests;
create policy "Players can remove their friend requests" on public.friend_requests
for delete to authenticated using (auth.uid() in (requester_id,addressee_id));

create table if not exists public.arena_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 40),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(owner_id,name)
);
create table if not exists public.arena_team_members (
  team_id uuid not null references public.arena_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check(role in ('CAPTAIN','MEMBER')),
  status text not null default 'INVITED' check(status in ('INVITED','ACTIVE','DECLINED')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index if not exists arena_team_members_user_idx on public.arena_team_members(user_id,status);

create or replace function public.is_arena_team_member(p_team_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.arena_team_members m where m.team_id=p_team_id and m.user_id=p_user_id and m.status='ACTIVE');
$$;
create or replace function public.is_arena_team_owner(p_team_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.arena_teams t where t.id=p_team_id and t.owner_id=p_user_id);
$$;
create or replace function public.is_arena_team_invited(p_team_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.arena_team_members m where m.team_id=p_team_id and m.user_id=p_user_id and m.status='INVITED');
$$;
revoke all on function public.is_arena_team_member(uuid,uuid) from public;
revoke all on function public.is_arena_team_owner(uuid,uuid) from public;
revoke all on function public.is_arena_team_invited(uuid,uuid) from public;
create or replace function public.are_arena_friends(p_user_a uuid,p_user_b uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.friend_requests f
    where f.status='ACCEPTED'
    and ((f.requester_id=p_user_a and f.addressee_id=p_user_b)
      or (f.requester_id=p_user_b and f.addressee_id=p_user_a)));
$$;
revoke all on function public.are_arena_friends(uuid,uuid) from public;
grant execute on function public.is_arena_team_member(uuid,uuid) to authenticated;
grant execute on function public.is_arena_team_owner(uuid,uuid) to authenticated;
grant execute on function public.is_arena_team_invited(uuid,uuid) to authenticated;
grant execute on function public.are_arena_friends(uuid,uuid) to authenticated;

alter table public.arena_teams enable row level security;
drop policy if exists "Team members can view their teams" on public.arena_teams;
create policy "Team members can view their teams" on public.arena_teams
for select to authenticated using (owner_id=auth.uid() or public.is_arena_team_member(id,auth.uid()) or public.is_arena_team_invited(id,auth.uid()));
drop policy if exists "Players can create their own teams" on public.arena_teams;
create policy "Players can create their own teams" on public.arena_teams
for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists "Team owners can update their teams" on public.arena_teams;
create policy "Team owners can update their teams" on public.arena_teams
for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Team owners can delete their teams" on public.arena_teams;
create policy "Team owners can delete their teams" on public.arena_teams
for delete to authenticated using(owner_id=auth.uid());

alter table public.arena_team_members enable row level security;
drop policy if exists "Team participants can view team membership" on public.arena_team_members;
create policy "Team participants can view team membership" on public.arena_team_members
for select to authenticated using (
  user_id=auth.uid() or invited_by=auth.uid() or public.is_arena_team_owner(team_id,auth.uid()) or public.is_arena_team_member(team_id,auth.uid())
);
drop policy if exists "Team owners can invite members" on public.arena_team_members;
create policy "Team owners can invite members" on public.arena_team_members
for insert to authenticated with check (
  invited_by=auth.uid() and public.is_arena_team_owner(team_id,auth.uid())
  and ((user_id<>auth.uid() and role='MEMBER' and status='INVITED' and public.are_arena_friends(auth.uid(),user_id))
    or (user_id=auth.uid() and role='CAPTAIN' and status='ACTIVE'))
);
drop policy if exists "Invited players can respond to invitations" on public.arena_team_members;
create policy "Invited players can respond to invitations" on public.arena_team_members
for update to authenticated using(user_id=auth.uid() and status='INVITED')
with check(user_id=auth.uid() and status in ('ACTIVE','DECLINED'));
drop policy if exists "Team owners or members can remove membership" on public.arena_team_members;
create policy "Team owners or members can remove membership" on public.arena_team_members
for delete to authenticated using (
  user_id=auth.uid() or public.is_arena_team_owner(team_id,auth.uid())
);

alter table public.tournament_registrations
  add column if not exists arena_team_id uuid references public.arena_teams(id) on delete set null;

-- Prevent users from changing the identity or role of an existing relationship.
create or replace function public.protect_friend_request_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Friend request participants cannot be changed';
  end if;
  return new;
end; $$;
drop trigger if exists protect_friend_request_identity on public.friend_requests;
create trigger protect_friend_request_identity before update on public.friend_requests
for each row execute function public.protect_friend_request_identity();

create or replace function public.protect_team_member_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.team_id is distinct from old.team_id
     or new.user_id is distinct from old.user_id
     or new.role is distinct from old.role
     or new.invited_by is distinct from old.invited_by then
    raise exception 'Team membership identity cannot be changed';
  end if;
  return new;
end; $$;
drop trigger if exists protect_team_member_identity on public.arena_team_members;
create trigger protect_team_member_identity before update on public.arena_team_members
for each row execute function public.protect_team_member_identity();

-- Tournament sign-up can use an existing captain-owned arena team.
drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated with check (
  user_id=auth.uid()
  and status='PENDING'
  and length(trim(coalesce(team_name,''))) between 2 and 40
  and jsonb_typeof(roster)='array'
  and jsonb_array_length(roster) between 1 and coalesce((
    select case
      when lower(t.format) like '2v2%' then 2
      when lower(t.format) like '3v3%' then 3
      else 5
    end
    from public.tournaments t where t.id=tournament_registrations.tournament_id
  ),5)
  and (arena_team_id is null or exists(
    select 1 from public.arena_teams team
    where team.id=tournament_registrations.arena_team_id and team.owner_id=auth.uid()
  ))
);
