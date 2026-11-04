-- VENTSPILS ARENA: player friendships and reusable community teams
create or replace view public.player_directory as
select id, nickname, display_name
from public.profiles
where nickname is not null and length(trim(nickname)) > 0;
grant select on public.player_directory to anon, authenticated;

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
revoke all on function public.is_arena_team_member(uuid,uuid) from public;
revoke all on function public.is_arena_team_owner(uuid,uuid) from public;
grant execute on function public.is_arena_team_member(uuid,uuid) to authenticated;
grant execute on function public.is_arena_team_owner(uuid,uuid) to authenticated;

alter table public.arena_teams enable row level security;
drop policy if exists "Team members can view their teams" on public.arena_teams;
create policy "Team members can view their teams" on public.arena_teams
for select to authenticated using (owner_id=auth.uid() or public.is_arena_team_member(id,auth.uid()));
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
  user_id=auth.uid() or invited_by=auth.uid() or public.is_arena_team_owner(team_id,auth.uid())
);
drop policy if exists "Team owners can invite members" on public.arena_team_members;
create policy "Team owners can invite members" on public.arena_team_members
for insert to authenticated with check (
  invited_by=auth.uid() and public.is_arena_team_owner(team_id,auth.uid())
  and ((user_id<>auth.uid() and role='MEMBER' and status='INVITED')
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
