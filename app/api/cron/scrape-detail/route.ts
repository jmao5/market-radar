/**
 * app/api/cron/scrape-detail/route.ts
 *
 * 병렬 처리 버전 — concurrency=4, 배치 DB 쓰기
 *
 * 개선 포인트:
 *   1. 순차 for-loop + 500ms 딜레이 제거 → chunk 단위 병렬 fetch
 *   2. Supabase 클라이언트 요청당 1회 생성
 *   3. 댓글 배치 upsert (개별 업데이트 → 1회 bulk)
 *   4. 기본 limit 20 (기존 10)
 *   5. 목록 스크래퍼에서 즉시 연계 호출 가능하도록 ?ids=uuid,uuid 지원
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

// ── Supabase 클라이언트 (요청당 1회) ─────────────────────────
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

// ── 병렬 청크 실행기 ─────────────────────────────────────────
interface FetchResult {
  postId: string
  dbId: string
  parsed: ParsedDetail | null
  error?: string
  isRateLimited?: boolean
}

// tasks를 concurrency 개씩 묶어 동시 실행하되, rate limit(430) 감지 시 조기 중단
async function runChunked(
  tasks: (() => Promise<FetchResult>)[],
  concurrency: number
): Promise<FetchResult[]> {
  const results: FetchResult[] = []
  let isRateLimited = false

  for (let i = 0; i < tasks.length; i += concurrency) {
    if (isRateLimited) break

    const chunk = tasks.slice(i, i + concurrency)

    // 첫 청크 이후 대기 시간 (500ms ~ 1500ms 무작위)
    if (i > 0) {
      const delay = 500 + Math.random() * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const chunkResults = await Promise.allSettled(chunk.map((fn) => fn()))
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
        if (r.value.isRateLimited) {
          isRateLimited = true
        }
      }
    }
  }
  return results
}

// ── 파서 ─────────────────────────────────────────────────────

interface ParsedDetail {
  bodyHtml: string
  bodyText: string
  voteCount: number
  hasContent: boolean
  postedAt: string | null
  comments: CommentRow[]
}

interface CommentRow {
  comment_srl: string
  parent_srl: string | null
  depth: number
  author: string | null
  content: string
  voted_count: number
  is_writer: boolean
}

function parsePostedAt(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()

  const absMatch = s.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s+(\d{2}):(\d{2})/)
  if (absMatch) {
    const [, y, mo, d, h, mi] = absMatch
    const kst = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`)
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }
  const timeOnly = s.match(/^(\d{1,2}):(\d{2})$/)
  if (timeOnly) {
    const [, h, mi] = timeOnly
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const y = kstNow.getUTCFullYear()
    const mo = String(kstNow.getUTCMonth() + 1).padStart(2, '0')
    const d = String(kstNow.getUTCDate()).padStart(2, '0')
    const kst = new Date(`${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00+09:00`)
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }
  const minMatch = s.match(/(\d+)\s*분\s*전/)
  if (minMatch) return new Date(Date.now() - parseInt(minMatch[1]) * 60_000).toISOString()
  const hrMatch = s.match(/(\d+)\s*시간\s*전/)
  if (hrMatch) return new Date(Date.now() - parseInt(hrMatch[1]) * 3_600_000).toISOString()
  const dayMatch = s.match(/(\d+)\s*일\s*전/)
  if (dayMatch) return new Date(Date.now() - parseInt(dayMatch[1]) * 86_400_000).toISOString()

  return null
}

function parseDetail(html: string): ParsedDetail {
  const $ = cheerio.load(html)

  const $content = $('article .xe_content').first()
  $content.find('script, style, .document_address').remove()

  $content.find('img').each((_, el) => {
    const src = $(el).attr('data-original') ?? $(el).attr('data-src') ?? $(el).attr('src') ?? ''
    if (src) $(el).attr('src', src.startsWith('//') ? `https:${src}` : src)
  })
  $content.find('source, video').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    if (src.startsWith('//')) $(el).attr('src', `https:${src}`)
  })

  const bodyHtml = $content.html() ?? ''
  const bodyText = $content.text().replace(/\s+/g, ' ').trim()
  const hasContent = bodyText.length >= 10 || $content.find('img, video, iframe').length > 0

  const voteText = $('.new_voted_count, #fm_vote span.btn_img').first().text().trim()
  const voteCount = parseInt(voteText.replace(/[^0-9]/g, ''), 10) || 0

  // posted_at: 상세 페이지가 더 정확한 시각을 제공
  let postedAt: string | null = null
  for (const sel of ['article .document_info .date', 'article header .date', 'time[datetime]', '.bd_wrp .date']) {
    const el = $(sel).first()
    if (!el.length) continue
    const dt = el.attr('datetime')
    if (dt) { const d = new Date(dt); if (!isNaN(d.getTime())) { postedAt = d.toISOString(); break } }
    const txt = el.text().trim()
    if (txt) { postedAt = parsePostedAt(txt); if (postedAt) break }
  }

  const comments: CommentRow[] = []
  const depthParentMap: Record<number, string> = {}

  $('ul.fdb_lst_ul > li.fdb_itm').each((_, el) => {
    const $li = $(el)
    const srlMatch = ($li.attr('id') ?? '').match(/comment_(\d+)/)
    if (!srlMatch) return

    const comment_srl = srlMatch[1]
    const marginPct = parseInt(($li.attr('style') ?? '').match(/margin-left:\s*(\d+)%/)?.[1] ?? '0', 10)
    const depth = marginPct === 0 ? 0 : marginPct <= 2 ? 1 : 2
    const parent_srl = depth > 0 ? (depthParentMap[depth - 1] ?? null) : null
    depthParentMap[depth] = comment_srl

    const author = $li.find('.meta .member_plate').clone().find('img').remove().end().text().trim() || null
    const $cc = $li.find('.comment-content .xe_content').first().clone()
    $cc.find('a.findParent').remove()
    const content = $cc.text().trim()
    if (!content) return

    const voted_count = parseInt($li.find('.voted_count').first().text().replace(/[^0-9]/g, ''), 10) || 0
    const is_writer = $li.find('.comment-content').hasClass('document_writer')

    comments.push({ comment_srl, parent_srl, depth, author, content, voted_count, is_writer })
  })

  return { bodyHtml, bodyText, voteCount, hasContent, postedAt, comments }
}

// ── 단일 게시글 fetch + parse (DB 쓰기 없음) ─────────────────
async function fetchAndParse(post: { id: string; url: string; post_id: string }): Promise<FetchResult> {
  try {
    const res = await fetch(post.url, { headers: FETCH_HEADERS, cache: 'no-store' })
    if (res.status === 430) {
      return { postId: post.post_id, dbId: post.id, parsed: null, error: 'HTTP 430', isRateLimited: true }
    }
    if (!res.ok) return { postId: post.post_id, dbId: post.id, parsed: null, error: `HTTP ${res.status}` }
    const html = await res.text()
    return { postId: post.post_id, dbId: post.id, parsed: parseDetail(html) }
  } catch (err) {
    return { postId: post.post_id, dbId: post.id, parsed: null, error: String(err) }
  }
}

// ── 배치 DB 쓰기 ─────────────────────────────────────────────
async function flushToDB(
  results: FetchResult[],
  supabase: ReturnType<typeof getAdminClient>
) {
  const now = new Date().toISOString()
  const succeeded: string[] = []
  const failed: string[] = []
  const allCommentRows: object[] = []

  for (const r of results) {
    if (!r.parsed) { failed.push(r.postId); continue }

    const { bodyHtml, bodyText, voteCount, hasContent, postedAt, comments } = r.parsed

    const updatePayload: Record<string, unknown> = {
      body_html: bodyHtml || null,
      body_text: bodyText || null,
      vote_count: voteCount,
      detail_scraped_at: hasContent ? now : null,
      scraped_at: now,
    }
    if (postedAt) updatePayload.posted_at = postedAt

    const { error } = await supabase.from('forum_posts').update(updatePayload).eq('id', r.dbId)
    if (error) { failed.push(r.postId); continue }

    succeeded.push(r.postId)

    for (const c of comments) {
      allCommentRows.push({
        post_id: r.dbId,
        comment_srl: c.comment_srl,
        parent_srl: c.parent_srl,
        depth: c.depth,
        author: c.author,
        content: c.content,
        voted_count: c.voted_count,
        is_writer: c.is_writer,
        scraped_at: now,
      })
    }
  }

  // 댓글 전체 1회 배치 upsert
  if (allCommentRows.length > 0) {
    await supabase
      .from('forum_comments')
      .upsert(allCommentRows, { onConflict: 'post_id,comment_srl', ignoreDuplicates: false })
  }

  return { succeeded, failed }
}

// ── Route Handler ─────────────────────────────────────────────

const CONCURRENCY = 2   // 동시 fetch 수 (fmkorea 서버 부하 고려: 기존 4에서 2로 완화)
const DEFAULT_LIMIT = 20

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'
  const specificId = req.nextUrl.searchParams.get('id')
  const idsParam = req.nextUrl.searchParams.get('ids')  // ?ids=uuid,uuid,...

  // 단건·다건 즉시 요청은 인증 없이 허용 (클라이언트 UI에서 호출)
  if (isProd && !specificId && !idsParam) {
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

  // ── 단건 모드 (?id=uuid) ────────────────────────────────────
  if (specificId) {
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('id, url, post_id')
      .eq('id', specificId)
      .single()

    if (error || !post) return NextResponse.json({ error: '게시글 없음' }, { status: 404 })

    const result = await fetchAndParse(post)
    const { succeeded, failed } = await flushToDB([result], supabase)
    return NextResponse.json({
      ok: succeeded.length > 0,
      succeeded,
      failed,
      isRateLimited: !!result.isRateLimited,
      result
    })
  }

  // ── 다건 즉시 모드 (?ids=uuid,uuid) — 목록 스크래퍼에서 연계 ─
  if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean).slice(0, 30)
    if (ids.length === 0) return NextResponse.json({ ok: true, processed: 0 })

    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select('id, url, post_id')
      .in('id', ids)
      .is('detail_scraped_at', null)  // 이미 스크래핑된 건 스킵

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!posts?.length) return NextResponse.json({ ok: true, message: '신규 게시글 없음', processed: 0 })

    const tasks = posts.map((p) => () => fetchAndParse(p))
    const results = await runChunked(tasks, CONCURRENCY)
    const { succeeded, failed } = await flushToDB(results, supabase)
    const isRateLimited = results.some((r) => r.isRateLimited)

    return NextResponse.json({
      ok: true,
      processed: posts.length,
      succeeded: succeeded.length,
      failed: failed.length,
      isRateLimited
    })
  }

  // ── 일괄 모드 (?limit=N, 스케줄러용) ────────────────────────
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 30)

  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, url, post_id')
    .is('detail_scraped_at', null)
    .order('scraped_at', { ascending: false })  // 최신 게시글 우선
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ ok: true, message: '처리할 게시글 없음', processed: 0 })

  const tasks = posts.map((p) => () => fetchAndParse(p))
  const results = await runChunked(tasks, CONCURRENCY)
  const { succeeded, failed } = await flushToDB(results, supabase)
  const isRateLimited = results.some((r) => r.isRateLimited)

  return NextResponse.json({
    ok: succeeded.length > 0,
    processed: posts.length,
    succeeded: succeeded.length,
    failed: failed.length,
    isRateLimited
  })
}
