-- NeuralFeed v2: duplicate detection (embeddings), story sources, Hindi, AI model tracker, Telegram.
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.

-- ---------- 1. Embeddings (duplicate detection, related articles, Ask NeuralFeed) ----------
create extension if not exists vector with schema extensions;

alter table public.articles add column if not exists embedding extensions.vector(768);

create index if not exists articles_embedding_idx
  on public.articles using hnsw (embedding extensions.vector_cosine_ops);

-- Nearest articles to a query embedding (cosine similarity, 1 = identical).
create or replace function public.match_articles(
  query_embedding extensions.vector(768),
  match_count int default 8,
  min_similarity float default 0.5,
  since timestamptz default null
)
returns table (
  id uuid, slug text, title text, summary text, content text, category text,
  source_name text, source_url text, image_url text, published_at timestamptz, similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select a.id, a.slug, a.title, a.summary, a.content, a.category,
         a.source_name, a.source_url, a.image_url, a.published_at,
         1 - (a.embedding <=> query_embedding) as similarity
  from public.articles a
  where a.embedding is not null
    and (since is null or a.published_at >= since)
    and 1 - (a.embedding <=> query_embedding) >= min_similarity
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

-- Related articles for an article page (uses the article's own embedding).
create or replace function public.related_articles(article_id uuid, match_count int default 5)
returns table (
  id uuid, slug text, title text, summary text, category text, tags text[],
  image_url text, source_name text, published_at timestamptz, ai_provider text, similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select b.id, b.slug, b.title, b.summary, b.category, b.tags,
         b.image_url, b.source_name, b.published_at, b.ai_provider,
         1 - (b.embedding <=> a.embedding) as similarity
  from public.articles a
  join public.articles b on b.id <> a.id and b.embedding is not null
  where a.id = article_id and a.embedding is not null
  order by b.embedding <=> a.embedding
  limit match_count;
$$;

grant execute on function public.match_articles(extensions.vector, int, float, timestamptz) to anon, authenticated;
grant execute on function public.related_articles(uuid, int) to anon, authenticated;

-- ---------- 2. Story clusters: other outlets that covered the same story ----------
create table if not exists public.article_sources (
  id          bigint generated always as identity primary key,
  article_id  uuid not null references public.articles(id) on delete cascade,
  source_name text not null,
  source_url  text not null unique,
  title       text,
  similarity  float,
  created_at  timestamptz not null default now()
);
create index if not exists article_sources_article_idx on public.article_sources (article_id);
alter table public.article_sources enable row level security;
drop policy if exists "Public can read article sources" on public.article_sources;
create policy "Public can read article sources" on public.article_sources for select to anon, authenticated using (true);

-- ---------- 3. Hindi translation ----------
alter table public.articles add column if not exists title_hi text;
alter table public.articles add column if not exists summary_hi text;
alter table public.articles add column if not exists content_hi text;
alter table public.articles add column if not exists key_points_hi text[];

-- ---------- 4. AI model tracker ----------
create table if not exists public.ai_models (
  id             bigint generated always as identity primary key,
  name           text not null,
  name_key       text not null unique,          -- lower-cased name for de-duplication
  company        text,
  release_type   text,                          -- open-weights | closed | api | unknown
  modality       text,                          -- text | multimodal | image | video | audio | code | other
  context_window text,
  parameters     text,
  summary        text,
  announced_at   timestamptz not null default now(),
  article_id     uuid references public.articles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists ai_models_announced_idx on public.ai_models (announced_at desc);
alter table public.ai_models enable row level security;
drop policy if exists "Public can read ai models" on public.ai_models;
create policy "Public can read ai models" on public.ai_models for select to anon, authenticated using (true);

-- ---------- 5. Telegram ----------
alter table public.articles add column if not exists telegram_posted_at timestamptz;

-- PostgREST must reload its schema cache to see the new columns/functions.
notify pgrst, 'reload schema';
