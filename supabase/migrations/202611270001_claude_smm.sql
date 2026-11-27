create table if not exists public.smm_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'INSTAGRAM' check (platform in ('INSTAGRAM','FACEBOOK','TIKTOK','OTHER')),
  title text not null,
  caption text not null default '',
  scheduled_at timestamptz,
  status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','PUBLISHED','REJECTED')),
  notes text not null default '',
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists smm_posts_created_at_idx on public.smm_posts (created_at desc);
create index if not exists smm_posts_scheduled_at_idx on public.smm_posts (scheduled_at);
alter table public.smm_posts enable row level security;
revoke all on public.smm_posts from anon, authenticated;
grant all on public.smm_posts to service_role;
