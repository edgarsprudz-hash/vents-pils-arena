-- Allow super administrators to review and update all tournament registrations
drop policy if exists "Super admins manage tournament registrations" on public.tournament_registrations;
create policy "Super admins manage tournament registrations" on public.tournament_registrations
for all to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
