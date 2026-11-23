-- Allow SUPER_ADMIN to add tournament teams manually without a linked player account.
-- Player-created registrations continue to require their authenticated user_id.
alter table public.tournament_registrations
  alter column user_id drop not null;

drop policy if exists "Super admins manage tournament registrations" on public.tournament_registrations;
create policy "Super admins manage tournament registrations" on public.tournament_registrations
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
