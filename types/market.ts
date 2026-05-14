/**
 * types/market.ts
 */

// ── 포럼 게시글 ───────────────────────────────────────────────

export interface ForumPost {
  id: string
  source: string
  post_id: string
  title: string
  author: string | null
  url: string
  view_count: number | null
  comment_count: number | null
  vote_count: number
  thumbnail_url: string | null
  category: string | null         // 추가: 카테고리 필드
  body_text: string | null       // 검색용 plain text
  body_html: string | null       // 렌더링용 HTML (이미지/영상 포함)
  scraped_at: string
  detail_scraped_at: string | null
  created_at: string
}

export type ForumPostSummary = Omit<ForumPost, 'body_text' | 'body_html' | 'detail_scraped_at'>

export interface WatchedAuthor {
  id: string
  author: string
  source: string
  last_scraped_at: string | null   // 추가: 마지막 수집 시간
  created_at: string
}

// ── 댓글 ─────────────────────────────────────────────────────

export interface ForumComment {
  id: string
  post_id: string
  comment_srl: string
  parent_srl: string | null
  depth: number                  // 0=일반, 1=대댓글, 2=대대댓글
  author: string | null
  content: string
  voted_count: number
  is_writer: boolean
  scraped_at: string
  created_at: string
}

// ── 뉴스 ─────────────────────────────────────────────────────

export interface StockNews {
  id: string
  source: string
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
  symbol: string
  name: string
  price: number
  change: number
  change_pct: number
  recorded_at: string
  created_at: string
}

// ── API 응답 ──────────────────────────────────────────────────

export interface ScrapeResult {
  success: boolean
  inserted: number
  skipped: number
  errors: string[]
  source: string
  scraped_at: string
}

export interface AuthorScrapeResult {
  success: boolean
  author: string
  inserted: number
  errors: string[]
}

export type MarketDirection = 'up' | 'down' | 'flat'

export interface MarketIndexDisplay extends MarketIndex {
  direction: MarketDirection
}
