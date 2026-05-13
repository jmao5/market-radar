/**
 * app/api/cron/scrape-author/route.ts
 *
 * 특정 작성자의 게시글을 에펨코리아 검색 API로 수집
 *
 * 동작:
 *   1. watched_authors 테이블에서 활성 작성자 목록 조회
 *   2. 각 작성자에 대해 search_target=nick_name 검색 결과 페이지 순회
 *   3. 이미 존재하는 post_id를 만나면 해당 작성자 수집 중단 (중복 회피)
 *   4. forum_posts에 upsert
 *
 * 호출:
 *   GET /api/cron/scrape-author
 *   GET /api/cron/scrape-author?author=수Z만세&full=1
 *
 * Rate limit:
 *   에펨코리아는 연속 요청 시 HTTP 430을 반환함.
 *   페이지 간 800~1400ms 랜덤 딜레이 + 430 시 8초 백오프 재시도(최대 2회)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import type { AuthorScrapeResult } from '@/types/market'

const SOURCE = 'fmkorea_stock'
const BASE_URL = 'https://www.fmkorea.com'
const SEARCH_URL = `${BASE_URL}/index.php`
const MAX_PAGES = 200
const PAGE_DELAY_MIN = 800     // 페이지 간 랜덤 딜레이 최솟값 (ms)
const PAGE_DELAY_MAX = 1400    // 페이지 간 랜덤 딜레이 최댓값 (ms)
const AUTHOR_DELAY = 3_000     // 작성자 간 딜레이 (ms)
const MAX_AUTHORS_PER_RUN = 5
const BACKOFF_BASE = 8_000     // 430 시 대기 기준 (ms) — attempt * BACKOFF_BASE
const MAX_RETRIES = 2

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// ── Supabase Admin ────────────────────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── 유틸 ─────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const randomDelay = () => sleep(PAGE_DELAY_MIN + Math.random() * (PAGE_DELAY_MAX - PAGE_DELAY_MIN))

function buildSearchUrl(author: string, page: number): string {
  const params = new URLSearchParams({
    mid: 'stock',
    search_keyword: author,
    search_target: 'nick_name',
    ...(page > 1 ? { page: String(page) } : {}),
  })
  return `${SEARCH_URL}?${params.toString()}`
}

function parseViewCount(raw: string): number | null {
  if (!raw) return null
  const s = raw.trim()
  if (s.includes('백만')) return Math.round(parseFloat(s) * 1_000_000)
  if (s.includes('만')) return Math.round(parseFloat(s) * 10_000)
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? null : n
}

// ── fetch + 430 백오프 재시도 ────────────────────────────────
async function fetchPage(url: string): Promise<
  { ok: true; html: string } | { ok: false; status: number; rateLimited: boolean }
> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' })

    if (res.status === 430) {
      if (attempt < MAX_RETRIES) {
        const wait = BACKOFF_BASE * (attempt + 1)
        console.warn(
          `[scrape-author] 430 rate limit — ${wait / 1000}s 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})`
        )
        await sleep(wait)
        continue
      }
      return { ok: false, status: 430, rateLimited: true }
    }

    if (!res.ok) return { ok: false, status: res.status, rateLimited: false }
    return { ok: true, html: await res.text() }
  }
  return { ok: false, status: 430, rateLimited: true }
}

// ── 검색 결과 페이지 파서 ────────────────────────────────────
interface RawPost {
  post_id: string
  title: string
  author: string | null
  url: string
  category: string | null
  view_count: number | null
  comment_count: number | null
  voted_count: number | null
}

function parseSearchPage(html: string): { posts: RawPost[]; hasNextPage: boolean } {
  const $ = cheerio.load(html)
  const posts: RawPost[] = []

  $('table.bd_lst tbody tr').each((_, el) => {
    const $tr = $(el)
    if ($tr.hasClass('notice')) return

    const $titleTd = $tr.find('td.title')
    if ($titleTd.length === 0) return

    // 검색 결과: a.hx 또는 href에 document_srl 포함
    const $link = $titleTd.find('a.hx, a[href*="document_srl"]').first()
    if ($link.length === 0) return

    const title = $link.clone().find('span, b').remove().end().text().trim()
    if (!title) return

    const href = $link.attr('href') || ''

    // post_id: document_srl 파라미터 우선, 없으면 경로 끝 숫자
    const dsrlMatch = href.match(/[?&]document_srl=(\d+)/)
    const pathMatch = href.match(/\/(\d+)(?:[?#]|$)/)
    const post_id = dsrlMatch?.[1] ?? pathMatch?.[1]
    if (!post_id) return

    const url = `${BASE_URL}/${post_id}`

    const category = $tr.find('td.cate a').first().text().trim() || null

    const $authorEl = $tr.find('td.author .member_plate').clone()
    $authorEl.find('img').remove()
    const author = $authorEl.text().trim() || null

    const replyText = $titleTd.find('a.replyNum').first().text().trim()
    const comment_count = replyText ? parseInt(replyText.replace(/\D/g, ''), 10) || null : null

    const view_count = parseViewCount($tr.find('td.m_no').first().text().trim())
    const votedRaw = $tr.find('td.m_no.m_no_voted').first().text().trim()
    const voted_count = votedRaw ? parseInt(votedRaw.replace(/\D/g, ''), 10) || null : null

    posts.push({ post_id, title, author, url, category, view_count, comment_count, voted_count })
  })

  // "다음" 버튼이 <a>면 다음 페이지 있음, <strong>이면 없음
  const hasNextPage =
    $('form.bd_pg a.direction').filter((_, el) => $(el).text().includes('다음')).length > 0

  return { posts, hasNextPage }
}

// ── 작성자 전체 수집 ─────────────────────────────────────────
async function scrapeAuthor(
  author: string,
  existingPostIds: Set<string>,
  fullScrape: boolean
): Promise<AuthorScrapeResult> {
  const res: AuthorScrapeResult = { success: false, author, inserted: 0, errors: [] }
  const supabase = getAdminClient()
  const now = new Date().toISOString()
  let totalInserted = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const fetched = await fetchPage(buildSearchUrl(author, page))

    if (!fetched.ok) {
      if (fetched.rateLimited) {
        // 재시도 후에도 rate limit → 수집 중단 (이미 저장한 것은 유지)
        res.errors.push(`rate limit 초과 — page ${page}에서 중단 (${totalInserted}건 수집됨)`)
        console.warn(`[scrape-author] ${author} rate limit 소진 — ${totalInserted}건 수집 후 중단`)
      } else {
        res.errors.push(`HTTP ${fetched.status} (page ${page})`)
      }
      break
    }

    const { posts, hasNextPage } = parseSearchPage(fetched.html)
    if (posts.length === 0) break

    // 중복 감지
    let shouldStop = false
    const newPosts: RawPost[] = []
    for (const p of posts) {
      if (!fullScrape && existingPostIds.has(p.post_id)) {
        shouldStop = true
        break
      }
      newPosts.push(p)
    }

    if (newPosts.length > 0) {
      const rows = newPosts.map((p) => ({
        source: SOURCE,
        post_id: p.post_id,
        title: p.title,
        author: p.author,
        url: p.url,
        category: p.category,
        view_count: p.view_count,
        comment_count: p.comment_count,
        thumbnail_url: null,
        scraped_at: now,
      }))

      const { error } = await supabase
        .from('forum_posts')
        .upsert(rows, { onConflict: 'url', ignoreDuplicates: false })

      if (error) {
        res.errors.push(`upsert 실패 (page ${page}): ${error.message}`)
        break
      }
      totalInserted += rows.length
    }

    if (shouldStop || !hasNextPage) break

    await randomDelay()
  }

  await supabase
    .from('watched_authors')
    .update({ last_scraped_at: now })
    .eq('source', SOURCE)
    .eq('author', author)

  res.inserted = totalInserted
  // 데이터를 1건이라도 저장했으면 success — rate limit으로 중단돼도 부분 성공 처리
  res.success = totalInserted > 0 || res.errors.length === 0
  return res
}

// ── Route Handler ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) {
    const auth = req.headers.get('authorization')
    const secret = req.headers.get('x-cron-secret')
    if (
      auth !== `Bearer ${process.env.CRON_SECRET}` &&
      secret !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getAdminClient()
  const { searchParams } = req.nextUrl
  const singleAuthor = searchParams.get('author')
  const fullScrape = searchParams.get('full') === '1'

  let authors: string[]

  if (singleAuthor) {
    authors = [singleAuthor]
    await supabase
      .from('watched_authors')
      .upsert(
        [{ source: SOURCE, author: singleAuthor }],
        { onConflict: 'source,author', ignoreDuplicates: true }
      )
  } else {
    const { data, error } = await supabase
      .from('watched_authors')
      .select('author')
      .eq('source', SOURCE)
      .order('last_scraped_at', { ascending: true, nullsFirst: true })
      .limit(MAX_AUTHORS_PER_RUN)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    authors = (data ?? []).map((r) => r.author)
  }

  if (authors.length === 0) {
    return NextResponse.json({ ok: true, message: '수집 대상 작성자 없음', results: [] })
  }

  const { data: existing } = await supabase
    .from('forum_posts')
    .select('post_id')
    .eq('source', SOURCE)
  const existingPostIds = new Set((existing ?? []).map((r) => r.post_id))

  const results: AuthorScrapeResult[] = []
  for (let i = 0; i < authors.length; i++) {
    const r = await scrapeAuthor(authors[i], existingPostIds, fullScrape)
    results.push(r)
    if (i < authors.length - 1) await sleep(AUTHOR_DELAY)
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0)
  const successCount = results.filter((r) => r.success).length
  const failedAuthors = results
    .filter((r) => !r.success)
    .map((r) => ({ author: r.author, errors: r.errors }))

  // 한 명이라도 데이터 저장에 성공했으면 ok: true
  const ok = successCount > 0 || results.length === 0

  return NextResponse.json({
    ok,
    authors_processed: results.length,
    success_count: successCount,
    total_inserted: totalInserted,
    failed: failedAuthors.length > 0 ? failedAuthors : undefined,
    results,
  })
}
