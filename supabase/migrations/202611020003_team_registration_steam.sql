-- VENTSPILS ARENA: team registration and Steam profile links
alter table public.tournament_registrations
  add column if not exists team_name text,
  add column if not exists roster jsonb not null default '[]'::jsonb,
  add column if not exists captain_name text;
alter table public.profiles add column if not exists steam_id text;
create unique index if not exists profiles_steam_id_unique on public.profiles(steam_id) where steam_id is not null;
drop policy if exists "Public can view registered tournament teams" on public.tournament_registrations;
create policy "Public can view registered tournament teams" on public.tournament_registrations
for select using (status = 'REGISTERED');
drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated with check (
 user_id = auth.uid() and status = 'REGISTERED'
 and length(trim(coalesce(team_name,''))) between 2 and 40
 and jsonb_typeof(roster) = 'array' and jsonb_array_length(roster) between 1 and 5
);
drop policy if exists "Players can update own tournament registration" on public.tournament_registrations;
create policy "Players can update own tournament registration" on public.tournament_registrations
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid() and status in ('REGISTERED','CANCELLED'));
