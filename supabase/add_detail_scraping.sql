-- ============================================================
-- Market Radar Hub — 상세 스크래핑 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── 1. forum_posts에 body_html 컬럼 추가 ─────────────────────
-- body_text는 기존 유지 (검색용), body_html은 렌더링용
alter table public.forum_posts
  add column if not exists body_html text,
  add column if not exists vote_count integer not null default 0,
  add column if not exists detail_scraped_at timestamptz;

-- ── 2. 댓글 테이블 ───────────────────────────────────────────
create table if not exists public.forum_comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references public.forum_posts(id) on delete cascade,
  comment_srl  text not null,
  parent_srl   text,                        -- null = 최상위 댓글
  depth        integer not null default 0,  -- 0=일반, 1=대댓글, 2=대대댓글
  author       text,
  content      text not null,
  voted_count  integer not null default 0,
  is_writer    boolean not null default false,  -- 원글 작성자 여부
  scraped_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (post_id, comment_srl)
);

create index if not exists idx_forum_comments_post_id
  on public.forum_comments (post_id, depth, created_at);

alter table public.forum_comments enable row level security;

create policy "forum_comments: public read"
  on public.forum_comments for select using (true);
