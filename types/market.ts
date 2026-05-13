/**
 * types/market.ts
 *
 * Market Radar Hub 전용 타입 정의
 * - Supabase 테이블 스키마와 1:1 대응
 */

// ── 포럼 게시글 (에펨코리아 주갤 등) ─────────────────────────

export interface ForumPost {
  id: string
  source: string           // 출처 식별자 (예: 'fmkorea_stock')
  post_id: string          // 원본 사이트 게시글 ID
  title: string
  author: string | null
  url: string              // 원본 URL (upsert 기준 unique key)
  view_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  body_text: string | null // 상세 본문 (2차 스크래핑 후 채움)
  scraped_at: string       // ISO 8601
  created_at: string
}

// ── 뉴스 ─────────────────────────────────────────────────────

export interface StockNews {
  id: string
  source: string           // 출처 (예: 'naver_finance', 'investing_com')
  title: string
  summary: string | null
  url: string
  image_url: string | null
  published_at: string | null
  scraped_at: string
  created_at: string
}

// ── 시장 지수 ─────────────────────────────────────────────────

export interface MarketIndex {
  id: string
  symbol: string           // 'KOSPI', 'KOSDAQ', 'SP500', 'NASDAQ', 'DOW', 'USD_KRW'
  name: string             // '코스피', '코스닥', ...
  price: number
  change: number           // 전일 대비 포인트 변화
  change_pct: number       // 전일 대비 % 변화
  recorded_at: string      // 데이터 기준 시각
  created_at: string
}

// ── API 응답 타입 ─────────────────────────────────────────────

export interface ScrapeResult {
  success: boolean
  inserted: number
  skipped: number
  errors: string[]
  source: string
  scraped_at: string
}

// ── 클라이언트 상태용 타입 ────────────────────────────────────

export type MarketDirection = 'up' | 'down' | 'flat'

export interface MarketIndexDisplay extends MarketIndex {
  direction: MarketDirection
}

// ForumPost의 목록용 경량 버전 (body_text 제외)
export type ForumPostSummary = Omit<ForumPost, 'body_text'>
