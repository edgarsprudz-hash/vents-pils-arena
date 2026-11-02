-- VENTSPILS ARENA: PDF regulations publishing
create table if not exists public.arena_regulations (
  id integer primary key default 1 check (id = 1),
  title text not null default 'OFFICIAL TOURNAMENT REGULATIONS',
  description text not null default '',
  file_path text not null,
  file_name text not null,
  updated_at timestamptz not null default now()
);
alter table public.arena_regulations enable row level security;

drop policy if exists "Public can read arena regulations" on public.arena_regulations;
create policy "Public can read arena regulations"
on public.arena_regulations for select using (true);

drop policy if exists "Super admins manage arena regulations" on public.arena_regulations;
create policy "Super admins manage arena regulations"
on public.arena_regulations for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arena-regulations', 'arena-regulations', true, 26214400, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

drop policy if exists "Public can view arena regulation PDFs" on storage.objects;
create policy "Public can view arena regulation PDFs"
on storage.objects for select using (bucket_id = 'arena-regulations');

drop policy if exists "Super admins upload arena regulation PDFs" on storage.objects;
create policy "Super admins upload arena regulation PDFs"
on storage.objects for insert to authenticated
with check (bucket_id = 'arena-regulations' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));

drop policy if exists "Super admins delete arena regulation PDFs" on storage.objects;
create policy "Super admins delete arena regulation PDFs"
on storage.objects for delete to authenticated
using (bucket_id = 'arena-regulations' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
