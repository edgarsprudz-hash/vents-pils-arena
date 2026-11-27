create table if not exists public.smm_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  platform text not null default 'INSTAGRAM' check (platform in ('INSTAGRAM')),
  format text not null check (format in ('POST','STORY','REEL')),
  language text not null default 'lv' check (language in ('lv','ru','en')),
  topic text not null,
  objective text not null default '',
  title text not null default '',
  caption text not null,
  hashtags text not null default '',
  visual_brief text not null default '',
  recommended_time text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PUBLISHED')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  meta_media_id text,
  rejection_note text
);

create index if not exists smm_posts_status_created_idx on public.smm_posts(status, created_at desc);
create index if not exists smm_posts_created_by_idx on public.smm_posts(created_by, created_at desc);

alter table public.smm_posts enable row level security;
-- All reads and writes go through server routes that verify profiles.role = 'SUPER_ADMIN'
-- and use the server-only Supabase service role key. No client-side table policies are created.

create or replace function public.set_smm_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists smm_posts_updated_at on public.smm_posts;
create trigger smm_posts_updated_at before update on public.smm_posts
for each row execute function public.set_smm_posts_updated_at();
