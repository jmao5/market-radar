/**
 * lib/supabase/watchedAuthorQueries.ts
 *
 * 관심 작성자 관련 Supabase 쿼리 함수
 */

import { createClient } from './client'
import type { WatchedAuthor, ForumPostSummary } from '@/types/market'

// ── 관심 작성자 CRUD ──────────────────────────────────────────

export async function getWatchedAuthors(): Promise<WatchedAuthor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('watched_authors')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WatchedAuthor[]
}

export async function addWatchedAuthor(
  author: string,
  source = 'fmkorea_stock'
): Promise<WatchedAuthor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('watched_authors')
    .upsert({ author, source }, { onConflict: 'source,author' })
    .select()
    .single()
  if (error) throw error
  return data as WatchedAuthor
}

export async function removeWatchedAuthor(
  author: string,
  source = 'fmkorea_stock'
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('watched_authors')
    .delete()
    .eq('author', author)
    .eq('source', source)
  if (error) throw error
}

// ── 관심 작성자 게시글 피드 ───────────────────────────────────

export async function getWatchedAuthorPosts(options?: {
  authors?: string[]
  limit?: number
  cursor?: string | null
  page?: number
}): Promise<{ items: ForumPostSummary[]; nextCursor: string | null; totalCount: number }> {
  const { authors, limit = 30, cursor, page } = options ?? {}
  const supabase = createClient()

  let query = supabase
    .from('forum_posts')
    .select(
      'id, source, post_id, title, author, url, category, view_count, comment_count, thumbnail_url, scraped_at, created_at',
      { count: 'exact' }
    )
    .order('scraped_at', { ascending: false })

  if (authors && authors.length > 0) {
    query = query.in('author', authors)
  }

  if (page !== undefined) {
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)
  } else {
    if (cursor) query = query.lt('scraped_at', cursor)
    query = query.limit(limit + 1)
  }

  const { data, error, count } = await query
  if (error) throw error

  let items = (data ?? []) as ForumPostSummary[]
  let nextCursor: string | null = null

  if (page === undefined) {
    const hasMore = items.length > limit
    items = hasMore ? items.slice(0, limit) : items
    nextCursor = hasMore ? items[items.length - 1].scraped_at : null
  }

  return { items, nextCursor, totalCount: count ?? 0 }
}

// ── TanStack Query 키 상수 ────────────────────────────────────

export const watchedAuthorQueryKeys = {
  all: () => ['watchedAuthors'] as const,
  posts: (authors: string[]) => ['watchedAuthorPosts', ...authors.sort()] as const,
}
