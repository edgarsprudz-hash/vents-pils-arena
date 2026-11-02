-- VENTSPILS ARENA: player tournament registrations
create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'REGISTERED' check (status in ('REGISTERED','CANCELLED')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
alter table public.tournament_registrations enable row level security;
drop policy if exists "Players can view own tournament registrations" on public.tournament_registrations;
create policy "Players can view own tournament registrations" on public.tournament_registrations
for select to authenticated using (user_id = auth.uid());
drop policy if exists "Super admins can view all tournament registrations" on public.tournament_registrations;
create policy "Super admins can view all tournament registrations" on public.tournament_registrations
for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
drop policy if exists "Players can register themselves" on public.tournament_registrations;
create policy "Players can register themselves" on public.tournament_registrations
for insert to authenticated with check (user_id = auth.uid() and status = 'REGISTERED');
drop policy if exists "Players can cancel own registration" on public.tournament_registrations;
create policy "Players can cancel own registration" on public.tournament_registrations
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'CANCELLED');
create index if not exists tournament_registrations_tournament_idx on public.tournament_registrations(tournament_id);
