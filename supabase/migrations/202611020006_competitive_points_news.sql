-- VENTSPILS ARENA: newsroom, tournament results and competitive points
create table if not exists public.arena_news (
 id uuid primary key default gen_random_uuid(), title text not null, excerpt text not null default '',
 content text not null default '', category text not null default 'NEWS',
 published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.arena_news enable row level security;
drop policy if exists "Public can read published arena news" on public.arena_news;
create policy "Public can read published arena news" on public.arena_news for select using (published = true or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
drop policy if exists "Super admins manage arena news" on public.arena_news;
create policy "Super admins manage arena news" on public.arena_news for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
create table if not exists public.tournament_results (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
 team_name text not null, place integer not null check(place between 1 and 100), points integer not null check(points>=0),
 created_at timestamptz not null default now(), unique(tournament_id,team_name)
);
alter table public.tournament_results enable row level security;
drop policy if exists "Public can read tournament results" on public.tournament_results;
create policy "Public can read tournament results" on public.tournament_results for select using(true);
drop policy if exists "Super admins manage tournament results" on public.tournament_results;
create policy "Super admins manage tournament results" on public.tournament_results for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
create table if not exists public.team_points (
 id uuid primary key default gen_random_uuid(), team_name text not null unique, points integer not null default 0,
 tournaments_played integer not null default 0, wins integer not null default 0, podiums integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.team_points enable row level security;
drop policy if exists "Public can read team rankings" on public.team_points;
create policy "Public can read team rankings" on public.team_points for select using(true);
drop policy if exists "Super admins manage team rankings" on public.team_points;
create policy "Super admins manage team rankings" on public.team_points for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
create or replace function public.apply_tournament_result_points() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.team_points(team_name,points,tournaments_played,wins,podiums,updated_at)
 values(new.team_name,new.points,1,case when new.place=1 then 1 else 0 end,case when new.place<=3 then 1 else 0 end,now())
 on conflict(team_name) do update set points=team_points.points+new.points,tournaments_played=team_points.tournaments_played+1,wins=team_points.wins+case when new.place=1 then 1 else 0 end,podiums=team_points.podiums+case when new.place<=3 then 1 else 0 end,updated_at=now();
 return new;
end; $$;
drop trigger if exists tournament_result_award_points on public.tournament_results;
create trigger tournament_result_award_points after insert on public.tournament_results for each row execute function public.apply_tournament_result_points();
