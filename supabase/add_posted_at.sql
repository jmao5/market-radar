-- forum_posts에 원본 게시 시간 컬럼 추가
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- posted_at 기준 최신순 인덱스 (기존 scraped_at 인덱스 보완)
CREATE INDEX IF NOT EXISTS idx_forum_posts_posted_at
  ON public.forum_posts (posted_at DESC NULLS LAST);

-- source + posted_at 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_forum_posts_source_posted_at
  ON public.forum_posts (source, posted_at DESC NULLS LAST);
