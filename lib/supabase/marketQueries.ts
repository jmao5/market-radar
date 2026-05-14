/**
 * lib/supabase/marketQueries.ts
 */

import { createClient } from './client'
import type { ForumPost, ForumPostSummary, ForumComment, MarketIndex, StockNews } from '@/types/market'

// body_html, body_text 제외한 목록용 컬럼
const POST_LIST_SELECT =
  'id, source, post_id, title, author, url, category, view_count, comment_count, vote_count, thumbnail_url, posted_at, scraped_at, detail_scraped_at, created_at'

export async function getForumPosts(options?: {
  source?: string
  limit?: number
  cursor?: string | null
  page?: number
}) {
  const { source, limit = 30, cursor, page } = options ?? {}
  const supabase = createClient()

  let query = supabase
    .from('forum_posts')
    .select(POST_LIST_SELECT, { count: 'exact' })
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('scraped_at', { ascending: false })

  if (source) query = query.eq('source', source)

  if (page !== undefined) {
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)
  } else {
    if (cursor) query = query.lt('posted_at', cursor)
    query = query.limit(limit + 1)
  }

  const { data, error, count } = await query
  if (error) throw error

  let items = (data ?? []) as ForumPostSummary[]
  let nextCursor: string | null = null

  if (page === undefined) {
    const hasMore = items.length > limit
    items = hasMore ? items.slice(0, limit) : items
    nextCursor = hasMore
      ? (items[items.length - 1].posted_at ?? items[items.length - 1].scraped_at)
      : null
  }

  return { items, nextCursor, totalCount: count ?? 0 }
}

export async function searchForumPosts(options: {
  query: string
  source?: string
  limit?: number
  cursor?: string | null
  page?: number
}): Promise<{ items: ForumPostSummary[]; nextCursor: string | null; totalCount: number }> {
  const { query: searchQuery, source = 'fmkorea_stock', limit = 30, cursor, page } = options
  const supabase = createClient()
  const q = `%${searchQuery}%`

  let query = supabase
    .from('forum_posts')
    .select(POST_LIST_SELECT, { count: 'exact' })
    .eq('source', source)
    .or(`title.ilike.${q},body_text.ilike.${q},author.ilike.${q}`)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('scraped_at', { ascending: false })

  if (page !== undefined) {
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)
  } else {
    if (cursor) query = query.lt('posted_at', cursor)
    query = query.limit(limit + 1)
  }

  const { data, error, count } = await query
  if (error) throw error

  let items = (data ?? []) as ForumPostSummary[]
  let nextCursor: string | null = null

  if (page === undefined) {
    const hasMore = items.length > limit
    items = hasMore ? items.slice(0, limit) : items
    nextCursor = hasMore
      ? (items[items.length - 1].posted_at ?? items[items.length - 1].scraped_at)
      : null
  }

  return { items, nextCursor, totalCount: count ?? 0 }
}

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

export async function getLatestMarketIndices(): Promise<MarketIndex[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('latest_market_indices')
    .select('*')
    .order('symbol', { ascending: true })
  if (error) throw error
  return data as MarketIndex[]
}

export const marketQueryKeys = {
  forumPosts: (source?: string) => ['forumPosts', source ?? 'all'] as const,
  forumPostDetail: (id: string) => ['forumPost', id] as const,
  forumComments: (postId: string) => ['forumComments', postId] as const,
  stockNews: () => ['stockNews'] as const,
  marketIndices: () => ['marketIndices'] as const,
}
