/**
 * app/api/cron/scrape-detail/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

interface ParsedDetail {
  bodyHtml: string
  bodyText: string
  voteCount: number
  hasContent: boolean
  postedAt: string | null   // ← 실제 게시글 작성 시간
  comments: {
    comment_srl: string
    parent_srl: string | null
    depth: number
    author: string | null
    content: string
    voted_count: number
    is_writer: boolean
  }[]
}

// ── 에펨코리아 날짜 파싱 ──────────────────────────────────────
// 형식 예시:
//   "2025.05.13 01:09"  → 절대 날짜
//   "2025-05-13 01:09"  → 절대 날짜 (대시 구분)
//   "01:09"             → 오늘 날짜 + 시간
//   "3분 전"            → 상대 시간
function parsePostedAt(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()

  // 절대 날짜: 2025.05.13 01:09 or 2025-05-13 01:09
  const absMatch = s.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})\s+(\d{2}):(\d{2})/)
  if (absMatch) {
    const [, y, mo, d, h, mi] = absMatch
    // KST(UTC+9) → UTC
    const kst = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`)
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }

  // 시간만: 01:09 → 오늘 KST 날짜 사용
  const timeOnly = s.match(/^(\d{1,2}):(\d{2})$/)
  if (timeOnly) {
    const [, h, mi] = timeOnly
    const now = new Date()
    // 오늘 날짜를 KST 기준으로 구성
    const kstOffset = 9 * 60 * 60 * 1000
    const todayKST = new Date(now.getTime() + kstOffset)
    const y = todayKST.getUTCFullYear()
    const mo = String(todayKST.getUTCMonth() + 1).padStart(2, '0')
    const d = String(todayKST.getUTCDate()).padStart(2, '0')
    const kst = new Date(`${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00+09:00`)
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }

  // 상대 시간: N분 전 → 현재 시각 기준 역산
  const minMatch = s.match(/(\d+)\s*분\s*전/)
  if (minMatch) {
    const d = new Date(Date.now() - parseInt(minMatch[1]) * 60 * 1000)
    return d.toISOString()
  }
  const hrMatch = s.match(/(\d+)\s*시간\s*전/)
  if (hrMatch) {
    const d = new Date(Date.now() - parseInt(hrMatch[1]) * 60 * 60 * 1000)
    return d.toISOString()
  }
  const dayMatch = s.match(/(\d+)\s*일\s*전/)
  if (dayMatch) {
    const d = new Date(Date.now() - parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000)
    return d.toISOString()
  }

  return null
}

function parseDetail(html: string): ParsedDetail {
  const $ = cheerio.load(html)

  // ── 본문 ──────────────────────────────────────────────────
  const $content = $('article .xe_content').first()
  $content.find('script, style, .document_address').remove()

  $content.find('img').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    const dataSrc = $(el).attr('data-original') ?? $(el).attr('data-src') ?? ''
    const resolved = dataSrc || src
    if (resolved) $(el).attr('src', resolved.startsWith('//') ? `https:${resolved}` : resolved)
  })
  $content.find('source').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    if (src.startsWith('//')) $(el).attr('src', `https:${src}`)
  })
  $content.find('video').each((_, el) => {
    const poster = $(el).attr('poster') ?? ''
    if (poster.startsWith('//')) $(el).attr('poster', `https:${poster}`)
  })

  const bodyHtml = $content.html() ?? ''
  const bodyText = $content.text().replace(/\s+/g, ' ').trim()
  const hasImages = $content.find('img, video, iframe').length > 0
  const hasContent = bodyText.length >= 10 || hasImages

  // ── 추천수 ────────────────────────────────────────────────
  const voteText = $('.new_voted_count, #fm_vote span.btn_img').first().text().trim()
  const voteCount = parseInt(voteText.replace(/[^0-9]/g, ''), 10) || 0

  // ── 작성 시간 ─────────────────────────────────────────────
  // 에펨코리아 상세 페이지: article header .date 또는 .document_info .date
  // 여러 선택자를 순서대로 시도
  let postedAt: string | null = null
  const dateSelectors = [
    'article .document_info .date',
    'article header .date',
    '.bd_wrp .date',
    'article .meta .date',
    'time[datetime]',
  ]
  for (const sel of dateSelectors) {
    const el = $(sel).first()
    if (!el.length) continue

    // <time datetime="..."> 우선
    const dt = el.attr('datetime')
    if (dt) {
      const parsed = new Date(dt)
      if (!isNaN(parsed.getTime())) { postedAt = parsed.toISOString(); break }
    }

    const txt = el.text().trim()
    if (txt) {
      postedAt = parsePostedAt(txt)
      if (postedAt) break
    }
  }

  // ── 댓글 ─────────────────────────────────────────────────
  const comments: ParsedDetail['comments'] = []
  const depthParentMap: Record<number, string> = {}

  $('ul.fdb_lst_ul > li.fdb_itm').each((_, el) => {
    const $li = $(el)
    const liId = $li.attr('id') ?? ''
    const srlMatch = liId.match(/comment_(\d+)/)
    if (!srlMatch) return

    const comment_srl = srlMatch[1]

    const marginStyle = $li.attr('style') ?? ''
    const marginMatch = marginStyle.match(/margin-left:\s*(\d+)%/)
    const marginPct = marginMatch ? parseInt(marginMatch[1], 10) : 0
    const depth = marginPct === 0 ? 0 : marginPct <= 2 ? 1 : 2

    const parent_srl = depth > 0 ? (depthParentMap[depth - 1] ?? null) : null
    depthParentMap[depth] = comment_srl

    const author =
      $li.find('.meta .member_plate').clone().find('img').remove().end().text().trim() || null

    const $commentContent = $li.find('.comment-content .xe_content').first().clone()
    $commentContent.find('a.findParent').remove()
    const content = $commentContent.text().trim()
    if (!content) return

    const votedText = $li.find('.voted_count').first().text().trim()
    const voted_count = parseInt(votedText.replace(/[^0-9]/g, ''), 10) || 0
    const is_writer = $li.find('.comment-content').hasClass('document_writer')

    comments.push({ comment_srl, parent_srl, depth, author, content, voted_count, is_writer })
  })

  return { bodyHtml, bodyText, voteCount, hasContent, postedAt, comments }
}

// ── 단일 게시글 스크래핑 ─────────────────────────────────────

async function scrapePostDetail(
  post: { id: string; url: string; post_id: string },
  forceUpdate = false
) {
  const supabase = getAdminClient()
  const now = new Date().toISOString()

  try {
    const res = await fetch(post.url, { headers: FETCH_HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const { bodyHtml, bodyText, voteCount, hasContent, postedAt, comments } = parseDetail(html)

    if (!hasContent && !forceUpdate) {
      await supabase.rpc('increment_scrape_attempt', { post_uuid: post.id }).catch(() => {})
      return {
        success: false,
        retryable: true,
        post_id: post.post_id,
        error: '본문 비어있음 — 재시도 대상으로 유지',
      }
    }

    const updatePayload: Record<string, unknown> = {
      body_html: bodyHtml || null,
      body_text: bodyText || null,
      vote_count: voteCount,
      detail_scraped_at: hasContent ? now : null,
      scraped_at: now,
    }

    // posted_at이 파싱됐으면 저장 (기존 값 덮어쓰지 않으려면 .is.null 조건 추가 가능)
    if (postedAt) {
      updatePayload.posted_at = postedAt
    }

    const { error: postError } = await supabase
      .from('forum_posts')
      .update(updatePayload)
      .eq('id', post.id)

    if (postError) throw new Error(`Post update failed: ${postError.message}`)

    if (comments.length > 0) {
      const commentRows = comments.map((c) => ({
        post_id: post.id,
        comment_srl: c.comment_srl,
        parent_srl: c.parent_srl,
        depth: c.depth,
        author: c.author,
        content: c.content,
        voted_count: c.voted_count,
        is_writer: c.is_writer,
        scraped_at: now,
      }))

      const { error: cmtError } = await supabase
        .from('forum_comments')
        .upsert(commentRows, { onConflict: 'post_id,comment_srl', ignoreDuplicates: false })

      if (cmtError) throw new Error(`Comment upsert failed: ${cmtError.message}`)
    }

    return {
      success: true,
      retryable: false,
      post_id: post.post_id,
      comments: comments.length,
      has_content: hasContent,
      posted_at: postedAt,
    }
  } catch (err) {
    return {
      success: false,
      retryable: true,
      post_id: post.post_id,
      error: String(err),
    }
  }
}

// ── Route Handler ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'
  const specificId = req.nextUrl.searchParams.get('id')
  const forceUpdate = req.nextUrl.searchParams.get('force') === '1'

  if (isProd && !specificId) {
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

  // ── 단건 모드 ─────────────────────────────────────────────
  if (specificId) {
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('id, url, post_id')
      .eq('id', specificId)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: '게시글 없음' }, { status: 404 })
    }

    const result = await scrapePostDetail(post, forceUpdate || true)
    return NextResponse.json({ ok: result.success, ...result })
  }

  // ── 일괄 모드 ─────────────────────────────────────────────
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(parseInt(limitParam ?? '5', 10) || 5, 30)

  const retryAfter = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, url, post_id, detail_scraped_at, body_text')
    .or(`detail_scraped_at.is.null,and(body_text.is.null,scraped_at.lt.${retryAfter})`)
    .order('scraped_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, message: '처리할 게시글 없음', processed: 0 })
  }

  const results = []
  for (const post of posts) {
    const result = await scrapePostDetail(post)
    results.push(result)
    await new Promise((r) => setTimeout(r, 500))
  }

  const succeeded = results.filter((r) => r.success).length
  const retryable = results.filter((r) => r.retryable).length

  return NextResponse.json({
    ok: succeeded > 0,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    retryable,
    results,
  })
}
