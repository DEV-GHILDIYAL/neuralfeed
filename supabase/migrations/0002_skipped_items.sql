-- Items the AI rejected (off-topic or duplicate story). Remembered so the
-- pipeline doesn't spend free-tier AI quota on them again in the next run.
create table if not exists public.skipped_items (
  source_url text primary key,
  title      text,
  reason     text,
  created_at timestamptz not null default now()
);

-- No public policies: only the pipeline (service-role key) can read/write.
alter table public.skipped_items enable row level security;
