-- NeuralFeed initial schema
-- Run in Supabase Dashboard → SQL Editor (or `supabase db push`).

create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  summary       text not null,              -- 1–2 line AI summary (cards)
  content       text not null,              -- AI-written article body (markdown-ish paragraphs)
  key_points    text[] not null default '{}',
  category      text not null default 'world',
  tags          text[] not null default '{}',
  image_url     text,
  source_name   text not null,
  source_url    text not null unique,       -- dedupe key: same story never inserted twice
  published_at  timestamptz not null default now(),
  ai_provider   text,
  ai_model      text,
  created_at    timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx on public.articles (category, published_at desc);

-- Full-text search
alter table public.articles
  add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) stored;
create index if not exists articles_search_idx on public.articles using gin (search);

-- Log of every pipeline run (useful for debugging free-tier limits)
create table if not exists public.pipeline_runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  fetched     int default 0,
  inserted    int default 0,
  failed      int default 0,
  providers   jsonb default '{}'::jsonb,
  error       text
);

-- Row Level Security: public can only READ articles. Writes happen with the service-role key (pipeline), which bypasses RLS.
alter table public.articles enable row level security;
alter table public.pipeline_runs enable row level security;

drop policy if exists "Public can read articles" on public.articles;
create policy "Public can read articles"
  on public.articles for select
  to anon, authenticated
  using (true);
