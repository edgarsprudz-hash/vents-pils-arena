create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number bigint generated always as identity unique,
  complainant_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Cheating','Rule Violation','Unsportsmanlike Conduct','Match Manipulation','Team Violation','Referee Complaint','Staff Complaint')),
  tournament_id uuid null references public.tournaments(id) on delete set null,
  match_reference text,
  reported_player text not null,
  subject text not null,
  description text not null check (char_length(description) between 20 and 5000),
  evidence_url text,
  status text not null default 'PENDING' check (status in ('PENDING','IN_REVIEW','EVIDENCE_REQUESTED','APPROVED','REJECTED','CLOSED','APPEAL_REVIEW')),
  verdict text,
  reviewer_id uuid references auth.users(id) on delete set null,
  appeal_text text,
  appeal_used boolean not null default false,
  appeal_submitted_at timestamptz,
  evidence_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.complaints enable row level security;
drop policy if exists "Complainants view own complaints" on public.complaints;
create policy "Complainants view own complaints" on public.complaints
for select to authenticated using (complainant_id = auth.uid());
drop policy if exists "Complainants create complaints" on public.complaints;
create policy "Complainants create complaints" on public.complaints
for insert to authenticated with check (complainant_id = auth.uid());
create index if not exists complaints_created_at_idx on public.complaints(created_at desc);
create index if not exists complaints_status_idx on public.complaints(status);
create table if not exists public.complaint_messages (
 id uuid primary key default gen_random_uuid(),
 complaint_id uuid not null references public.complaints(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 message text not null check (char_length(message) between 1 and 4000),
 internal boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.complaint_messages enable row level security;
drop policy if exists "Users view noninternal messages on own complaints" on public.complaint_messages;
create policy "Users view noninternal messages on own complaints" on public.complaint_messages
for select to authenticated using (
 internal = false and exists (
  select 1 from public.complaints c where c.id = complaint_id and c.complainant_id = auth.uid()
 )
);
create index if not exists complaint_messages_complaint_idx on public.complaint_messages(complaint_id,created_at);
