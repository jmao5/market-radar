/**
 * lib/supabase/marketQueries.ts
 *
 * Market Radar Hub 전용 Supabase 쿼리 함수
 * TanStack Query의 queryFn으로 바로 사용 가능
 */

import { createClient } from './client'
import type { ForumPost, ForumComment, MarketIndex, StockNews } from '@/types/market'

// ── 포럼 게시글 ───────────────────────────────────────────────

/**
 * 포럼 게시글 목록 조회 (최신순)
 * body_text는 목록에서 제외 (용량 절감)
 */
export async function getForumPosts(options?: {
  source?: string
  limit?: number
  cursor?: string | null
}) {
  const { source, limit = 30, cursor } = options ?? {}
  const supabase = createClient()

  let query = supabase
    .from('forum_posts')
    .select('id, source, post_id, title, author, url, view_count, comment_count, thumbnail_url, scraped_at, created_at')
    .order('scraped_at', { ascending: false })
    .limit(limit + 1)

  if (source) query = query.eq('source', source)
  if (cursor) query = query.lt('scraped_at', cursor)

  const { data, error } = await query
  if (error) throw error

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? items[items.length - 1].scraped_at : null

  return { items: items as Omit<ForumPost, 'body_text'>[], nextCursor }
}

/**
 * 게시글 검색 (제목 + 본문 ilike)
 * Supabase or() 필터 사용
 */
export async function searchForumPosts(options: {
  query: string
  source?: string
  limit?: number
}): Promise<Omit<ForumPost, 'body_text'>[]> {
  const { query, source = 'fmkorea_stock', limit = 30 } = options
  const supabase = createClient()
  const q = `%${query}%`

  const { data, error } = await supabase
    .from('forum_posts')
    .select('id, source, post_id, title, author, url, category, view_count, comment_count, thumbnail_url, scraped_at, created_at')
    .eq('source', source)
    .or(`title.ilike.${q},body_text.ilike.${q}`)
    .order('scraped_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Omit<ForumPost, 'body_text'>[]
}

/**
 * 단일 게시글 상세 조회 (body_text 포함)
 */
export async function getForumPostDetail(id: string): Promise<ForumPost> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ForumPost
}

/**
 * 게시글 댓글 목록 조회 (depth + created_at 순)
 */
export async function getForumComments(postId: string): Promise<ForumComment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', postId)
    .order('depth', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as ForumComment[]
}

// ── 뉴스 ─────────────────────────────────────────────────────

export async function getStockNews(limit = 20): Promise<StockNews[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('stock_news')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as StockNews[]
}

// ── 시장 지수 ─────────────────────────────────────────────────

/**
 * 심볼별 최신 지수 1건씩 반환
 * (latest_market_indices 뷰 사용)
 */
export async function getLatestMarketIndices(): Promise<MarketIndex[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('latest_market_indices')
    .select('*')
    .order('symbol', { ascending: true })

  if (error) throw error
  return data as MarketIndex[]
}

// ── TanStack Query 키 상수 ────────────────────────────────────
export const marketQueryKeys = {
  forumPosts: (source?: string) => ['forumPosts', source ?? 'all'] as const,
  forumPostDetail: (id: string) => ['forumPost', id] as const,
  forumComments: (postId: string) => ['forumComments', postId] as const,
  stockNews: () => ['stockNews'] as const,
  marketIndices: () => ['marketIndices'] as const,
}
