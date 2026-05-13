-- ============================================================
-- Market Radar Hub — 마이그레이션: forum_posts category 컬럼 추가
-- + forum_comments 테이블이 없는 경우 생성
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── forum_posts: category 컬럼 추가 ──────────────────────────
alter table public.forum_posts
  add column if not exists category text;

-- ── forum_comments (이미 add_comments.sql로 생성한 경우 중복 무시) ──
create table if not exists public.forum_comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references public.forum_posts(id) on delete cascade,
  comment_srl  text not null,
  parent_srl   text,
  depth        integer not null default 0,
  author       text,
  content      text not null,
  voted_count  integer not null default 0,
  is_writer    boolean not null default false,
  scraped_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (post_id, comment_srl)
);

create index if not exists idx_forum_comments_post_id
  on public.forum_comments (post_id, depth, created_at);

alter table public.forum_comments enable row level security;

-- 중복 실행 시 에러 방지
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'forum_comments' and policyname = 'forum_comments: public read'
  ) then
    execute 'create policy "forum_comments: public read" on public.forum_comments for select using (true)';
  end if;
end $$;
