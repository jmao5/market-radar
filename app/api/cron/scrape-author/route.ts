/**
 * app/api/cron/scrape-author/route.ts
 *
 * 관심 작성자 게시글 스크래핑 API
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import { parsePostedAt } from '@/app/api/cron/scrape/route'
import type { AuthorScrapeResult } from '@/types/market'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

function buildAuthorSearchUrl(author: string, page = 1): string {
  const params = new URLSearchParams({
    mid: 'stock',
    category: '',
    search_keyword: author,
    search_target: 'nick_name',
    ...(page > 1 ? { page: String(page) } : {}),
  })
  return `https://www.fmkorea.com/search.php?${params.toString()}`
}

interface RawPost {
  post_id: string
  title: string
  author: string | null
  url: string
  view_count: number | null
  comment_count: number | null
  category: string | null
  posted_at: string | null
}

function parsePostList(html: string): RawPost[] {
  const $ = cheerio.load(html)
  const posts: RawPost[] = []

  $('table.bd_lst tbody tr').each((_, el) => {
    const $tr = $(el)
    if ($tr.hasClass('notice')) return

    const $titleTd = $tr.find('td.title')
    if ($titleTd.length === 0) return

    const category = $tr.find('td.cate a').first().text().trim() || null
    const $titleLink = $titleTd.find('a.hx, a[href*="document_srl"]').first()
    const title = $titleLink.clone().find('span, b').remove().end().text().trim()
    const href = $titleLink.attr('href') || ''
    if (!title || !href) return

    // document_srl 파라미터 우선, 없으면 경로 끝 숫자
    const dsrlMatch = href.match(/[?&]document_srl=(\d+)/)
    const pathMatch = href.match(/\/(\d+)(?:[?#]|$)/)
    const post_id = dsrlMatch?.[1] ?? pathMatch?.[1]
    if (!post_id) return

    const url = `https://www.fmkorea.com/${post_id}`

    const replyText = $titleTd.find('a.replyNum').first().text().trim()
    const comment_count = replyText ? parseInt(replyText.replace(/[^0-9]/g, ''), 10) || null : null

    const author = $tr.find('td.author .member_plate').clone().find('img').remove().end().text().trim() || null

    const viewRaw = $tr.find('td.m_no').first().text().trim()
    let view_count: number | null = null
    if (viewRaw) {
      if (viewRaw.includes('백만')) view_count = Math.round(parseFloat(viewRaw) * 1_000_000)
      else if (viewRaw.includes('만')) view_count = Math.round(parseFloat(viewRaw) * 10_000)
      else { const n = parseInt(viewRaw.replace(/[^0-9]/g, ''), 10); view_count = isNaN(n) ? null : n }
    }

    const timeRaw = $tr.find('td.time').text().trim()
    const posted_at = parsePostedAt(timeRaw)

    posts.push({ post_id, title, author, url, view_count, comment_count, category, posted_at })
  })

  return posts
}

async function scrapeAuthor(author: string, source: string, maxPages = 3): Promise<AuthorScrapeResult> {
  const result: AuthorScrapeResult = { success: false, author, inserted: 0, errors: [] }

  try {
    const allPosts: RawPost[] = []

    for (let page = 1; page <= maxPages; page++) {
      const url = buildAuthorSearchUrl(author, page)
      const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' })

      if (res.status === 430) {
        result.errors.push(`HTTP 430 (page ${page})`)
        break
      }
      if (!res.ok) { result.errors.push(`HTTP ${res.status} (page ${page})`); break }

      const html = await res.text()
      const posts = parsePostList(html)
      if (posts.length === 0) break

      allPosts.push(...posts)
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400)) // 무작위 딜레이로 차단 방지
    }

    if (allPosts.length === 0) { result.success = true; return result }

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    const rows = allPosts.map((p) => ({
      source,
      post_id: p.post_id,
      title: p.title,
      author: p.author,
      url: p.url,
      view_count: p.view_count,
      comment_count: p.comment_count,
      thumbnail_url: null,
      category: p.category,
      posted_at: p.posted_at,
      scraped_at: now,
    }))

    const { error: upsertErr } = await supabase
      .from('forum_posts')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false })

    if (upsertErr) { result.errors.push(`upsert 실패: ${upsertErr.message}`); return result }

    await supabase
      .from('watched_authors')
      .update({ last_scraped_at: now })
      .eq('author', author)
      .eq('source', source)

    result.inserted = rows.length
    result.success = true
  } catch (err) {
    result.errors.push(`예외: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      cronSecret !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getAdminClient()
  const { data: watched, error } = await supabase
    .from('watched_authors')
    .select('author, source')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!watched || watched.length === 0) {
    return NextResponse.json({ ok: true, message: '감시 중인 작성자 없음', results: [] })
  }

  const results: AuthorScrapeResult[] = []
  let isRateLimited = false

  for (const wa of watched) {
    if (isRateLimited) {
      results.push({
        success: false,
        author: wa.author,
        inserted: 0,
        errors: ['IP가 임시 차단되었습니다 (430)'],
      })
      continue
    }

    const r = await scrapeAuthor(wa.author, wa.source)
    results.push(r)

    if (r.errors.some((e) => e.includes('HTTP 430'))) {
      isRateLimited = true
    }

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400)) // 차단 예방 딜레이
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    if (!isRateLimited) {
      await fetch(`${baseUrl}/api/cron/scrape-detail?limit=20`, {
        headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
        cache: 'no-store',
      })
    }
  } catch { /* 상세 스크래핑 실패해도 전체 결과는 반환 */ }

  return NextResponse.json({
    ok: results.every((r) => r.success) && !isRateLimited,
    authors_processed: results.length,
    total_inserted: results.reduce((sum, r) => sum + r.inserted, 0),
    isRateLimited,
    results,
  })
}
