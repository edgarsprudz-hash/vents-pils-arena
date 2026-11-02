-- Pending approval workflow and allow re-registration after cancellation.
alter table public.tournament_registrations drop constraint if exists tournament_registrations_status_check;
alter table public.tournament_registrations add constraint tournament_registrations_status_check check (status in ('PENDING','REGISTERED','CANCELLED'));
alter table public.tournament_registrations alter column status set default 'PENDING';
alter table public.tournament_registrations drop constraint if exists tournament_registrations_tournament_id_user_id_key;
drop index if exists public.tournament_registrations_tournament_user_active_uidx;
create unique index tournament_registrations_tournament_user_active_uidx
on public.tournament_registrations(tournament_id,user_id)
where status in ('PENDING','REGISTERED');
-- Admins may approve/reject/delete registrations; users can only cancel their own.
drop policy if exists "Super admins manage tournament registrations" on public.tournament_registrations;
create policy "Super admins manage tournament registrations" on public.tournament_registrations
for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
drop policy if exists "Players can update own tournament registration" on public.tournament_registrations;
drop policy if exists "Players can cancel own registration" on public.tournament_registrations;
create policy "Players can cancel own registration" on public.tournament_registrations
for update to authenticated using(user_id=auth.uid())
with check(user_id=auth.uid() and status='CANCELLED');
