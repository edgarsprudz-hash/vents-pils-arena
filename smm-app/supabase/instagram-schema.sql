-- Run once in Supabase SQL Editor for the SMM app.
create table if not exists public.ig_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ig_user_id text not null,
  username text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.ig_connections enable row level security;
-- No client policies: access is server-side only through the service role.

create table if not exists public.ig_media_insights (
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  caption text,
  media_type text,
  media_product_type text,
  permalink text,
  published_at timestamptz,
  like_count integer,
  comments_count integer,
  insights jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, media_id)
);
alter table public.ig_media_insights enable row level security;
-- No client policies: access is server-side only through the service role.
