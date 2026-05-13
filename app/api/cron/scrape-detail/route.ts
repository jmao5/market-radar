/**
 * app/api/cron/scrape-detail/route.ts
 *
 * 에펨코리아 게시글 상세 스크래핑 API
 * - forum_posts 중 body_text가 null인 최신 N건을 골라
 *   상세 페이지를 fetch → 본문 + 댓글을 파싱해 저장
 *
 * 호출: GET /api/cron/scrape-detail?limit=10
 * 보호: scrape route와 동일한 인증 방식
 *
 * 파싱 대상 HTML 구조 (에펨코리아 sketchbook5_elkha 스킨):
 *   본문  : article .xe_content
 *   댓글  : ul.fdb_lst_ul > li.fdb_itm
 *     - li#comment_{srl}
 *     - li.re → 대댓글 (style margin-left 기준 depth 계산)
 *     - .meta .member_plate : 작성자
 *     - .comment-content .xe_content : 내용
 *     - .xe_content a.findParent : 인용(멘션) 링크 → 제거
 *     - .vote .voted_count : 추천수
 *     - .document_writer : 원글 작성자 클래스
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import type { DetailScrapeResult } from '@/types/market'

// ── Supabase Admin ────────────────────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── fetch 공통 헤더 ───────────────────────────────────────────
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// ── 본문 파서 ─────────────────────────────────────────────────
// 대상: article 안의 첫 번째 .xe_content div
// 광고(ins.adsbygoogle), script, iframe 제거 후 텍스트 추출
function parseBody($: cheerio.CheerioAPI): string | null {
  const $content = $('article .xe_content').first()
  if ($content.length === 0) return null

  $content.find('script, ins, iframe, .adsbygoogle').remove()

  const text = $content
    .text()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')

  return text || null
}

// ── 댓글 depth 계산 ──────────────────────────────────────────
// li.re의 style="margin-left:N%" 기준
// 2% → depth 1, 4% → depth 2
function parseDepth($li: cheerio.Cheerio<any>): number {
  if (!$li.hasClass('re')) return 0
  const style = $li.attr('style') || ''
  const match = style.match(/margin-left:\s*(\d+)%/)
  if (!match) return 1
  return Math.round(parseInt(match[1], 10) / 2)
}

// ── 댓글 파서 ─────────────────────────────────────────────────
interface RawComment {
  comment_srl: string
  parent_srl: string | null
  depth: number
  author: string | null
  content: string
  voted_count: number
  is_writer: boolean
}

function parseComments($: cheerio.CheerioAPI): RawComment[] {
  const comments: RawComment[] = []

  $('ul.fdb_lst_ul li.fdb_itm').each((_, el) => {
    const $li = $(el)

    // li#comment_{srl} 에서 srl 추출
    const liId = $li.attr('id') || ''
    const srlMatch = liId.match(/^comment_(\d+)$/)
    if (!srlMatch) return
    const comment_srl = srlMatch[1]

    // depth
    const depth = parseDepth($li)

    // 부모 srl — li.re의 경우 .xe_content a.findParent href에서 추출
    // href 예시: "/9820054857/9820057286#comment_9820057286"
    //            → 두 번째 숫자 세그먼트가 부모 comment_srl
    let parent_srl: string | null = null
    if (depth > 0) {
      const parentHref = $li.find('.xe_content a.findParent').first().attr('href') || ''
      // href 패턴: /{post_srl}/{parent_comment_srl}#comment_{parent_comment_srl}
      const parentMatch = parentHref.match(/\/\d+\/(\d+)#comment_\d+/)
      if (parentMatch) parent_srl = parentMatch[1]
    }

    // 작성자 (레벨 이미지 alt 텍스트 제외, 닉네임만)
    const author =
      $li.find('.meta .member_plate').clone().find('img').remove().end().text().trim() || null

    // is_writer (원글 작성자 — .comment-content 에 .document_writer 클래스)
    const is_writer = $li.find('.comment-content').hasClass('document_writer')

    // 내용 — 멘션(findParent) 링크 텍스트를 제거한 뒤 추출
    const $contentDiv = $li.find('.xe_content').first().clone()
    $contentDiv.find('a.findParent').remove()
    const content = $contentDiv
      .text()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .trim()

    if (!content) return

    // 추천수
    const votedText = $li.find('.vote .voted_count').first().text().trim()
    const voted_count = votedText ? parseInt(votedText, 10) || 0 : 0

    comments.push({ comment_srl, parent_srl, depth, author, content, voted_count, is_writer })
  })

  return comments
}

// ── 단일 게시글 상세 스크래핑 ────────────────────────────────
async function scrapePostDetail(
  postDbId: string,
  postUrl: string
): Promise<DetailScrapeResult> {
  const result: DetailScrapeResult = {
    success: false,
    post_url: postUrl,
    body_updated: false,
    comments_upserted: 0,
    errors: [],
  }

  try {
    const res = await fetch(postUrl, {
      headers: FETCH_HEADERS,
      cache: 'no-store',
    })

    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}: ${postUrl}`)
      return result
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    const body_text = parseBody($)
    const rawComments = parseComments($)

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    // ── 본문 업데이트 ──────────────────────────────────────────
    const { error: bodyErr } = await supabase
      .from('forum_posts')
      .update({ body_text: body_text ?? '', scraped_at: now })
      .eq('id', postDbId)

    if (bodyErr) {
      result.errors.push(`본문 업데이트 실패: ${bodyErr.message}`)
    } else {
      result.body_updated = true
    }

    // ── 댓글 upsert ────────────────────────────────────────────
    if (rawComments.length > 0) {
      const commentRows = rawComments.map((c) => ({
        post_id: postDbId,
        comment_srl: c.comment_srl,
        parent_srl: c.parent_srl,
        depth: c.depth,
        author: c.author,
        content: c.content,
        voted_count: c.voted_count,
        is_writer: c.is_writer,
        scraped_at: now,
      }))

      const { error: cErr } = await supabase
        .from('forum_comments')
        .upsert(commentRows, { onConflict: 'post_id,comment_srl', ignoreDuplicates: false })

      if (cErr) {
        result.errors.push(`댓글 upsert 실패: ${cErr.message}`)
      } else {
        result.comments_upserted = rawComments.length
      }
    }

    result.success = result.errors.length === 0
  } catch (err) {
    result.errors.push(`예외 발생: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

// ── Route Handler ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const validManual = cronSecret === process.env.CRON_SECRET
    if (!validVercel && !validManual) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // limit 및 id 파라미터
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(parseInt(limitParam ?? '10', 10) || 10, 30)
  const specificId = req.nextUrl.searchParams.get('id')

  const supabase = getAdminClient()

  let query = supabase
    .from('forum_posts')
    .select('id, url')
    .is('body_text', null)

  if (specificId) {
    query = query.eq('id', specificId).limit(1)
  } else {
    query = query.eq('source', 'fmkorea_stock').order('scraped_at', { ascending: false }).limit(limit)
  }

  const { data: posts, error: fetchErr } = await query

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, message: '처리할 게시글 없음', results: [] })
  }

  // 순차 처리 (에펨코리아 서버 부하 방지, 300ms 간격)
  const results: DetailScrapeResult[] = []
  for (const post of posts) {
    const r = await scrapePostDetail(post.id, post.url)
    results.push(r)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  const successCount = results.filter((r) => r.success).length
  const totalComments = results.reduce((sum, r) => sum + r.comments_upserted, 0)

  return NextResponse.json({
    ok: successCount === results.length,
    processed: results.length,
    success: successCount,
    total_comments: totalComments,
    results,
  })
}
