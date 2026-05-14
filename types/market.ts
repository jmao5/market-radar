/**
 * types/market.ts
 */

export interface ForumPost {
  id: string
  source: string
  post_id: string
  title: string
  author: string | null
  url: string
  category: string | null
  view_count: number | null
  comment_count: number | null
  vote_count: number           // 추천수 (detail 스크래핑 후 채움)
  thumbnail_url: string | null
  body_text: string | null     // 평문 텍스트 (검색용)
  body_html: string | null     // HTML 본문 (렌더링용, detail 스크래핑 후 채움)
  posted_at: string | null     // 원본 게시 시간 (KST→UTC)
  scraped_at: string
  detail_scraped_at: string | null  // 상세 스크래핑 완료 시각 (null=미완료)
  created_at: string
}

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

export interface ScrapeResult {
  success: boolean
  inserted: number
  skipped: number
  errors: string[]
  source: string
  scraped_at: string
}

export type MarketDirection = 'up' | 'down' | 'flat'

export interface MarketIndexDisplay extends MarketIndex {
  direction: MarketDirection
}

// 목록용 경량 버전 (body_html, body_text 제외)
export type ForumPostSummary = Omit<ForumPost, 'body_html' | 'body_text'>

export interface ForumComment {
  id: string
  post_id: string
  comment_srl: string
  parent_srl: string | null
  depth: number
  author: string | null
  content: string
  voted_count: number
  is_writer: boolean
  scraped_at: string
  created_at: string
}

export interface DetailScrapeResult {
  success: boolean
  post_url: string
  body_updated: boolean
  comments_upserted: number
  errors: string[]
}

export interface WatchedAuthor {
  id: string
  source: string
  author: string
  last_scraped_at: string | null
  created_at: string
}

export interface AuthorScrapeResult {
  success: boolean
  author: string
  inserted: number
  errors: string[]
}
