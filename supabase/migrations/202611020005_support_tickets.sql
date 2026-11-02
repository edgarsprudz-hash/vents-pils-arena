-- VENTSPILS ARENA: support ticket inbox
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  email text not null check (char_length(email) between 3 and 254),
  category text not null check (category in ('Account & login','Tournament registration','Team management','Technical issue','Report a player','Other')),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
drop policy if exists "Anyone can create support tickets" on public.support_tickets;
create policy "Anyone can create support tickets" on public.support_tickets
for insert to anon, authenticated with check (true);
drop policy if exists "Super admins manage support tickets" on public.support_tickets;
create policy "Super admins manage support tickets" on public.support_tickets
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
