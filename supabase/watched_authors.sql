-- ============================================================
-- watched_authors 테이블
-- 관심 작성자 목록. source + author 조합이 유니크 키.
-- ============================================================

create table if not exists public.watched_authors (
  id               uuid primary key default uuid_generate_v4(),
  source           text not null default 'fmkorea_stock',
  author           text not null,
  last_scraped_at  timestamptz,
  created_at       timestamptz not null default now(),
  constraint watched_authors_source_author_key unique (source, author)
);

-- 등록 순 조회용 인덱스
create index if not exists idx_watched_authors_created_at
  on public.watched_authors (created_at desc);

-- 작성자명으로 게시글 조회 성능을 위해 forum_posts.author 인덱스 추가
create index if not exists idx_forum_posts_author
  on public.forum_posts (author, scraped_at desc)
  where author is not null;

-- RLS
alter table public.watched_authors enable row level security;

create policy "watched_authors: public read"
  on public.watched_authors for select using (true);

create policy "watched_authors: public insert"
  on public.watched_authors for insert with check (true);

create policy "watched_authors: public delete"
  on public.watched_authors for delete using (true);
