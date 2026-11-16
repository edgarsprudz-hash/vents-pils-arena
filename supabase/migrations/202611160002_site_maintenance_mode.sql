create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read maintenance setting" on public.site_settings;
create policy "Public can read maintenance setting" on public.site_settings
for select to anon, authenticated using (key = 'maintenance_mode');
drop policy if exists "Super admins can insert site settings" on public.site_settings;
create policy "Super admins can insert site settings" on public.site_settings
for insert to authenticated with check (
  key = 'maintenance_mode'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN')
);
drop policy if exists "Super admins can update site settings" on public.site_settings;
create policy "Super admins can update site settings" on public.site_settings
for update to authenticated using (
  key = 'maintenance_mode'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN')
) with check (
  key = 'maintenance_mode'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN')
);
insert into public.site_settings(key,value)
values ('maintenance_mode', '{"enabled": false, "message": "VENTSPILS ARENA is temporarily unavailable while we carry out technical maintenance. Please check back soon."}'::jsonb)
on conflict (key) do nothing;
