-- Private in-site messages between VENTSPILS ARENA administrators and tournament registrants.
create table if not exists public.arena_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists arena_messages_recipient_created_idx on public.arena_messages(recipient_id, created_at desc);
alter table public.arena_messages enable row level security;
drop policy if exists "Users can read messages they sent or received" on public.arena_messages;
create policy "Users can read messages they sent or received" on public.arena_messages
for select to authenticated using (
  recipient_id = auth.uid() or
  (sender_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'))
);
drop policy if exists "Super admins can message registered players" on public.arena_messages;
create policy "Super admins can message registered players" on public.arena_messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN')
  and exists (
    select 1 from public.tournament_registrations r
    where r.id = registration_id and r.user_id = recipient_id
      and r.tournament_id = tournament_id
  )
);
drop policy if exists "Recipients can mark messages as read" on public.arena_messages;
create policy "Recipients can mark messages as read" on public.arena_messages
for update to authenticated using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- Recipients may only update the read timestamp, not message content or sender metadata.
revoke update on public.arena_messages from authenticated;
grant update (read_at) on public.arena_messages to authenticated;
