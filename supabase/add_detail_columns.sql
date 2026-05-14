-- ============================================================
-- Market Radar Hub — 상세 스크래핑 컬럼 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── forum_posts: 상세 스크래핑 관련 컬럼 추가 ─────────────────

-- 원본 HTML 본문 (이미지/링크 포함 렌더링용)
alter table public.forum_posts
  add column if not exists body_html text;

-- 추천수
alter table public.forum_posts
  add column if not exists vote_count integer not null default 0;

-- 상세 스크래핑 완료 시각 (null = 미완료 → 스케줄러 처리 대상)
alter table public.forum_posts
  add column if not exists detail_scraped_at timestamptz;

-- detail_scraped_at 인덱스 (null 우선 + 오래된 순 조회용)
create index if not exists idx_forum_posts_detail_scraped_at
  on public.forum_posts (detail_scraped_at asc nulls first);
