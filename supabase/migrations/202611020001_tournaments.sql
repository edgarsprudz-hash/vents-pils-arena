-- VENTSPILS ARENA: tournament management
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game text not null default 'CS2',
  description text not null default '',
  event_date timestamptz,
  location text not null default 'Ventspils, Latvia',
  status text not null default 'DRAFT' check (status in ('DRAFT','REGISTRATION','LIVE','COMPLETED','CANCELLED')),
  format text not null default 'TBD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tournaments enable row level security;
drop policy if exists "Public can view tournaments" on public.tournaments;
create policy "Public can view tournaments" on public.tournaments
for select using (true);
drop policy if exists "Super admins manage tournaments" on public.tournaments;
create policy "Super admins manage tournaments" on public.tournaments
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
create index if not exists tournaments_event_date_idx on public.tournaments(event_date);
