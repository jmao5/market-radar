-- ============================================================
-- Market Radar Hub — 댓글 테이블 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

create table if not exists public.forum_comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references public.forum_posts(id) on delete cascade,
  comment_srl  text not null,                    -- 원본 댓글 ID (li#comment_{srl})
  parent_srl   text,                             -- 대댓글인 경우 부모 댓글 srl (null=최상위)
  depth        integer not null default 0,       -- 0=일반, 1=대댓글, 2=대대댓글
  author       text,
  content      text not null,
  voted_count  integer not null default 0,
  is_writer    boolean not null default false,   -- 원글 작성자 여부 (.document_writer)
  scraped_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (post_id, comment_srl)
);

create index if not exists idx_forum_comments_post_id
  on public.forum_comments (post_id, depth, created_at);

alter table public.forum_comments enable row level security;

create policy "forum_comments: public read"
  on public.forum_comments for select using (true);
