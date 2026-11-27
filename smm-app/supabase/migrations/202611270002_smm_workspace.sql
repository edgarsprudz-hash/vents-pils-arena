create table if not exists public.smm_workspace_posts (
 id uuid primary key default gen_random_uuid(), title text not null, caption text not null default '',
 platform text not null default 'INSTAGRAM' check (platform in ('INSTAGRAM','FACEBOOK','TIKTOK','OTHER')),
 status text not null default 'DRAFT' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','PUBLISHED','REJECTED')),
 scheduled_at timestamptz, metrics jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null, approved_by uuid references auth.users(id) on delete set null,
 published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists smm_workspace_posts_created_at_idx on public.smm_workspace_posts(created_at desc);
alter table public.smm_workspace_posts enable row level security;
revoke all on public.smm_workspace_posts from anon, authenticated;
grant all on public.smm_workspace_posts to service_role;
