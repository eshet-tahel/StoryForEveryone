-- Collaborative stories schema. No auth: anyone can read and append.
-- Apply via Supabase dashboard SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.sentences (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.stories(id) on delete cascade,
  text        text not null check (length(trim(text)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists sentences_story_id_created_at_idx
  on public.sentences (story_id, created_at);

create index if not exists stories_created_at_idx
  on public.stories (created_at desc);

alter table public.stories   enable row level security;
alter table public.sentences enable row level security;

drop policy if exists "stories_public_read"   on public.stories;
drop policy if exists "stories_public_insert" on public.stories;
drop policy if exists "sentences_public_read"   on public.sentences;
drop policy if exists "sentences_public_insert" on public.sentences;

create policy "stories_public_read"   on public.stories   for select using (true);
create policy "stories_public_insert" on public.stories   for insert with check (true);
create policy "sentences_public_read"   on public.sentences for select using (true);
create policy "sentences_public_insert" on public.sentences for insert with check (true);

alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.sentences;
