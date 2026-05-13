/**
 * app/api/cron/scrape-detail/route.ts
 *
 * 게시글 상세 본문 + 댓글 스크래핑 API
 *
 * 호출: GET /api/cron/scrape-detail?limit=5
 * 동작: detail_scraped_at이 null인 게시글을 오래된 순으로 가져와
 *       각각 상세 페이지를 긁어 body_html, 댓글을 저장
 *
 * HTML 구조 (실제 확인):
 *   본문: article .xe_content (innerHTML 그대로 저장)
 *   댓글: ul.fdb_lst_ul > li.fdb_itm
 *     - li#comment_{srl}
 *     - li.re → 대댓글 (style="margin-left:2%" = depth 1, "margin-left:4%" = depth 2)
 *     - .meta .member_plate → 작성자
 *     - .comment-content .xe_content → 댓글 내용
 *     - .voted_count → 추천수
 *     - .document_writer → 원글 작성자 여부
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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// ── 본문 + 댓글 파서 ──────────────────────────────────────────

interface ParsedDetail {
  bodyHtml: string
  bodyText: string
  voteCount: number
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

function parseDetail(html: string): ParsedDetail {
  const $ = cheerio.load(html)

  // ── 본문 HTML ───────────────────────────────────────────────
  // article 안의 .xe_content (클래스명이 document_{srl}_{member_srl} 형태)
  const $content = $('article .xe_content').first()

  // 광고/불필요한 요소 제거
  $content.find('script, style, .document_address').remove()

  // 이미지 src를 절대 URL로 변환
  $content.find('img').each((_, el) => {
    const src = $(el).attr('src') || ''
    if (src.startsWith('//')) $(el).attr('src', `https:${src}`)
    // lazy load 처리
    const dataSrc = $(el).attr('data-original') || $(el).attr('data-src')
    if (dataSrc) $(el).attr('src', dataSrc.startsWith('//') ? `https:${dataSrc}` : dataSrc)
  })

  // 동영상 source src 절대 URL 변환
  $content.find('source').each((_, el) => {
    const src = $(el).attr('src') || ''
    if (src.startsWith('//')) $(el).attr('src', `https:${src}`)
  })

  // video poster 절대 URL 변환
  $content.find('video').each((_, el) => {
    const poster = $(el).attr('poster') || ''
    if (poster.startsWith('//')) $(el).attr('poster', `https:${poster}`)
  })

  const bodyHtml = $content.html() ?? ''
  const bodyText = $content.text().replace(/\s+/g, ' ').trim()

  // ── 추천수 ─────────────────────────────────────────────────
  const voteText = $('.new_voted_count, #fm_vote span.btn_img').first().text().trim()
  const voteCount = parseInt(voteText.replace(/[^0-9]/g, ''), 10) || 0

  // ── 댓글 파싱 ──────────────────────────────────────────────
  const comments: ParsedDetail['comments'] = []

  // 댓글 스택: 대댓글의 부모 추적
  // margin-left:2% = depth 1, margin-left:4% = depth 2
  const depthParentMap: Record<number, string> = {}

  $('ul.fdb_lst_ul > li.fdb_itm').each((_, el) => {
    const $li = $(el)

    // comment_srl: li#comment_{srl}
    const liId = $li.attr('id') || ''
    const srlMatch = liId.match(/comment_(\d+)/)
    if (!srlMatch) return

    const comment_srl = srlMatch[1]

    // depth: margin-left 퍼센트로 판단
    const marginStyle = $li.attr('style') || ''
    const marginMatch = marginStyle.match(/margin-left:\s*(\d+)%/)
    const marginPct = marginMatch ? parseInt(marginMatch[1], 10) : 0
    const depth = marginPct === 0 ? 0 : marginPct === 2 ? 1 : 2

    // 부모 srl 추적
    const parent_srl = depth > 0 ? (depthParentMap[depth - 1] ?? null) : null
    depthParentMap[depth] = comment_srl

    // 작성자
    const author = $li.find('.meta .member_plate').first().text().trim() || null

    // 내용 (.xe_content 안 텍스트, 대댓글 멘션 포함)
    const $commentContent = $li.find('.comment-content .xe_content').first()
    // findParent(멘션 링크) 텍스트 제거하고 본문만
    $commentContent.find('a.findParent').remove()
    const content = $commentContent.text().trim()
    if (!content) return

    // 추천수
    const votedText = $li.find('.voted_count').first().text().trim()
    const voted_count = parseInt(votedText.replace(/[^0-9]/g, ''), 10) || 0

    // 원글 작성자 여부
    const is_writer = $li.find('.comment-content').hasClass('document_writer')

    comments.push({ comment_srl, parent_srl, depth, author, content, voted_count, is_writer })
  })

  return { bodyHtml, bodyText, voteCount, comments }
}

// ── 단일 게시글 상세 스크래핑 ────────────────────────────────

async function scrapePostDetail(post: { id: string; url: string; post_id: string }) {
  const supabase = getAdminClient()
  const now = new Date().toISOString()

  try {
    const res = await fetch(post.url, { headers: FETCH_HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const { bodyHtml, bodyText, voteCount, comments } = parseDetail(html)

    // 본문 업데이트
    const { error: postError } = await supabase
      .from('forum_posts')
      .update({
        body_html: bodyHtml,
        body_text: bodyText,
        vote_count: voteCount,
        detail_scraped_at: now,
        scraped_at: now,
      })
      .eq('id', post.id)

    if (postError) throw new Error(`Post update failed: ${postError.message}`)

    // 댓글 upsert
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

    return { success: true, post_id: post.post_id, comments: comments.length }
  } catch (err) {
    return { success: false, post_id: post.post_id, error: String(err) }
  }
}

// ── Route Handler ─────────────────────────────────────────────

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

  // 한 번에 처리할 게시글 수 (기본 5개, 최대 20개)
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(parseInt(limitParam ?? '5', 10) || 5, 20)

  const supabase = getAdminClient()

  // detail_scraped_at이 null인 것 우선, 그다음 오래된 것
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, url, post_id')
    .or('detail_scraped_at.is.null,detail_scraped_at.lt.' + new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('detail_scraped_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, message: '처리할 게시글 없음', processed: 0 })
  }

  // 순차 처리 (에펨코리아 rate limit 방지, 요청 간 500ms 딜레이)
  const results = []
  for (const post of posts) {
    const result = await scrapePostDetail(post)
    results.push(result)
    await new Promise((r) => setTimeout(r, 500))
  }

  const succeeded = results.filter((r) => r.success).length

  return NextResponse.json({
    ok: succeeded === results.length,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  })
}
