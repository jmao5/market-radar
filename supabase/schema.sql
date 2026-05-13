-- ============================================================
-- Market Radar Hub — Supabase Schema
-- Supabase SQL Editor에 전체 붙여넣기 후 실행하세요.
-- ============================================================

-- ── 확장 ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. 포럼 게시글 ────────────────────────────────────────────
create table if not exists public.forum_posts (
  id            uuid primary key default uuid_generate_v4(),
  source        text not null,                   -- 'fmkorea_stock'
  post_id       text not null,                   -- 원본 사이트 게시글 ID
  title         text not null,
  author        text,
  url           text not null unique,            -- upsert 기준
  view_count    integer,
  comment_count integer,
  thumbnail_url text,
  body_text     text,                            -- 상세 본문 (2차 스크래핑)
  scraped_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- 최신순 조회 인덱스
create index if not exists idx_forum_posts_scraped_at
  on public.forum_posts (scraped_at desc);

create index if not exists idx_forum_posts_source
  on public.forum_posts (source, scraped_at desc);

-- ── 2. 주식 뉴스 ─────────────────────────────────────────────
create table if not exists public.stock_news (
  id           uuid primary key default uuid_generate_v4(),
  source       text not null,                    -- 'naver_finance'
  title        text not null,
  summary      text,
  url          text not null unique,             -- upsert 기준
  image_url    text,
  published_at timestamptz,
  scraped_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_stock_news_scraped_at
  on public.stock_news (scraped_at desc);

-- ── 3. 시장 지수 ─────────────────────────────────────────────
create table if not exists public.market_indices (
  id          uuid primary key default uuid_generate_v4(),
  symbol      text not null,                     -- 'KOSPI', 'KOSDAQ', ...
  name        text not null,
  price       numeric(12, 2) not null,
  change      numeric(10, 2) not null default 0,
  change_pct  numeric(6, 2) not null default 0,
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- 심볼별 최신 1건 빠르게 조회하기 위한 인덱스
create index if not exists idx_market_indices_symbol_recorded
  on public.market_indices (symbol, recorded_at desc);

-- ── RLS (Row Level Security) ──────────────────────────────────
-- 스크래핑 데이터는 로그인 없이 읽기 허용, 쓰기는 service_role만

alter table public.forum_posts  enable row level security;
alter table public.stock_news   enable row level security;
alter table public.market_indices enable row level security;

-- 모든 사용자 읽기 허용
create policy "forum_posts: public read"
  on public.forum_posts for select using (true);

create policy "stock_news: public read"
  on public.stock_news for select using (true);

create policy "market_indices: public read"
  on public.market_indices for select using (true);

-- ── 편의 뷰: 심볼별 최신 지수 ────────────────────────────────
create or replace view public.latest_market_indices as
select distinct on (symbol)
  id, symbol, name, price, change, change_pct, recorded_at, created_at
from public.market_indices
order by symbol, recorded_at desc;
