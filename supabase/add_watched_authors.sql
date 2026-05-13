-- ============================================================
-- Market Radar Hub — watched_authors 테이블 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 관심 작성자 테이블
create table if not exists public.watched_authors (
  id              uuid primary key default uuid_generate_v4(),
  source          text not null default 'fmkorea_stock',
  author          text not null,
  last_scraped_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (source, author)
);

alter table public.watched_authors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'watched_authors' and policyname = 'watched_authors: public read'
  ) then
    execute 'create policy "watched_authors: public read" on public.watched_authors for select using (true)';
  end if;
end $$;

-- forum_posts에 voted_count 컬럼 추가 (작성자 검색 시 추천수 수집)
alter table public.forum_posts
  add column if not exists voted_count integer;

-- 인덱스: 작성자별 빠른 조회
create index if not exists idx_forum_posts_author_source
  on public.forum_posts (source, author, scraped_at desc);
