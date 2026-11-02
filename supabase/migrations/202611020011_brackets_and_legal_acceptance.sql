-- VENTSPILS ARENA: single-elimination brackets and GDPR-style policy acceptance log
create table if not exists public.tournament_matches (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 round_number integer not null check(round_number > 0),
 match_number integer not null check(match_number > 0),
 bracket_type text not null default 'MAIN' check(bracket_type in ('MAIN','THIRD_PLACE')),
 team_a text,
 team_b text,
 winner_team text,
 next_match_id uuid references public.tournament_matches(id) on delete set null,
 next_slot text check(next_slot in ('A','B')),
 status text not null default 'SCHEDULED' check(status in ('SCHEDULED','COMPLETED')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tournament_id,bracket_type,round_number,match_number),
 check(winner_team is null or winner_team=team_a or winner_team=team_b)
);
alter table public.tournament_matches enable row level security;
drop policy if exists "Public can read tournament matches" on public.tournament_matches;
create policy "Public can read tournament matches" on public.tournament_matches for select using(true);
drop policy if exists "Super admins manage tournament matches" on public.tournament_matches;
create policy "Super admins manage tournament matches" on public.tournament_matches for all to authenticated
using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'))
with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));
create index if not exists tournament_matches_event_idx on public.tournament_matches(tournament_id,bracket_type,round_number,match_number);

create table if not exists public.legal_acceptances (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 terms_version text not null,
 privacy_version text not null,
 accepted_at timestamptz not null default now(),
 unique(user_id,terms_version,privacy_version)
);
alter table public.legal_acceptances enable row level security;
drop policy if exists "Users can read own legal acceptances" on public.legal_acceptances;
create policy "Users can read own legal acceptances" on public.legal_acceptances for select to authenticated using(user_id=auth.uid());
drop policy if exists "Users can record own legal acceptances" on public.legal_acceptances;
create policy "Users can record own legal acceptances" on public.legal_acceptances for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "Super admins can read legal acceptances" on public.legal_acceptances;
create policy "Super admins can read legal acceptances" on public.legal_acceptances for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN'));

create or replace function public.log_signup_legal_acceptance() returns trigger
language plpgsql security definer set search_path=public as $$
declare terms_v text; privacy_v text;
begin
 terms_v := new.raw_user_meta_data->>'terms_version';
 privacy_v := new.raw_user_meta_data->>'privacy_version';
 if coalesce(new.raw_user_meta_data->>'legal_consent','false')='true'
    and terms_v is not null and privacy_v is not null then
  insert into public.legal_acceptances(user_id,terms_version,privacy_version)
  values(new.id,terms_v,privacy_v) on conflict(user_id,terms_version,privacy_version) do nothing;
 end if;
 return new;
end; $$;
drop trigger if exists log_signup_legal_acceptance on auth.users;
create trigger log_signup_legal_acceptance after insert on auth.users
for each row execute function public.log_signup_legal_acceptance();
