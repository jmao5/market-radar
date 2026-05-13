/**
 * app/api/cron/scrape/route.ts
 *
 * 에펨코리아 주식 갤러리 목록 스크래핑 API
 *
 * 호출: GET /api/cron/scrape
 * 보호:
 *   - 로컬: 인증 없이 허용
 *   - 프로덕션(Vercel Cron): Authorization 헤더 자동 검증
 *   - 프로덕션(외부 호출): x-cron-secret 헤더 검증
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import type { ScrapeResult } from '@/types/market'

// ── Supabase Admin 클라이언트 (service_role — RLS 우회) ────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── 스크래핑 대상 설정 ────────────────────────────────────────
const TARGETS = [
  {
    source: 'fmkorea_stock',
    url: 'https://www.fmkorea.com/stock',
    parse: parseFmkoreaStock,
  },
]

// ── 에펨코리아 주식 갤러리 파서 ──────────────────────────────
// 실제 HTML 구조:
//   table.bd_lst > tbody > tr  (notice 클래스 = 공지)
//   td.cate  : 카테고리
//   td.title > a[href] : 제목 링크 (href="/9820024410")
//   td.title > a.replyNum : 댓글 수
//   td.author .member_plate : 닉네임
//   td.m_no (첫 번째) : 조회수

interface RawPost {
  post_id: string
  title: string
  author: string | null
  url: string
  view_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  category: string | null
}

function parseFmkoreaStock(html: string): RawPost[] {
  const $ = cheerio.load(html)
  const posts: RawPost[] = []

  $('table.bd_lst tbody tr').each((_, el) => {
    const $tr = $(el)

    // 공지 행 제외
    if ($tr.hasClass('notice')) return

    const $titleTd = $tr.find('td.title')
    if ($titleTd.length === 0) return

    // ── 제목 링크 ──────────────────────────────────────────────
    // ── 카테고리 ────────────────────────────────────────────────
    const category = $tr.find('td.cate a').first().text().trim() || null

    const $titleLink = $titleTd.find('a').first()
    const title = $titleLink.text().trim()
    const href = $titleLink.attr('href') || ''
    if (!title || !href) return

    const url = href.startsWith('http') ? href : `https://www.fmkorea.com${href}`
    const postIdMatch = href.match(/\/(\d+)(?:\?.*)?$/)
    const post_id = postIdMatch ? postIdMatch[1] : href

    // ── 댓글 수 ────────────────────────────────────────────────
    const replyText = $titleTd.find('a.replyNum').first().text().trim()
    const comment_count = replyText ? parseInt(replyText.replace(/[^0-9]/g, ''), 10) || null : null

    // ── 작성자 ──────────────────────────────────────────────────
    const author = $tr.find('td.author .member_plate').text().trim() || null

    // ── 조회수 (축약형 처리: 73만, 1백만) ──────────────────────
    const viewRaw = $tr.find('td.m_no').first().text().trim()
    let view_count: number | null = null
    if (viewRaw) {
      if (viewRaw.includes('백만')) {
        view_count = Math.round(parseFloat(viewRaw) * 1_000_000)
      } else if (viewRaw.includes('만')) {
        view_count = Math.round(parseFloat(viewRaw) * 10_000)
      } else {
        const n = parseInt(viewRaw.replace(/[^0-9]/g, ''), 10)
        view_count = isNaN(n) ? null : n
      }
    }

    posts.push({ post_id, title, author, url, view_count, comment_count, thumbnail_url: null, category })
  })

  return posts
}

// ── 단일 타겟 스크래핑 실행 ───────────────────────────────────
async function scrapeTarget(target: (typeof TARGETS)[number]): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    success: false,
    inserted: 0,
    skipped: 0,
    errors: [],
    source: target.source,
    scraped_at: new Date().toISOString(),
  }

  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}: ${target.url}`)
      return result
    }

    const html = await res.text()
    const rawPosts = target.parse(html)

    if (rawPosts.length === 0) {
      result.errors.push('파싱 결과 0건 — HTML 구조 변경 가능성')
      return result
    }

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    const rows = rawPosts.map((p) => ({
      source: target.source,
      post_id: p.post_id,
      title: p.title,
      author: p.author,
      url: p.url,
      view_count: p.view_count,
      comment_count: p.comment_count,
      thumbnail_url: p.thumbnail_url,
      category: p.category,
      scraped_at: now,
    }))

    const { error } = await supabase
      .from('forum_posts')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false })

    if (error) {
      result.errors.push(`DB upsert 실패: ${error.message}`)
      return result
    }

    result.inserted = rows.length
    result.success = true
  } catch (err) {
    result.errors.push(`예외 발생: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

// ── Route Handler ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    // Vercel Cron은 Authorization: Bearer <CRON_SECRET> 헤더를 자동으로 붙임
    const authHeader = req.headers.get('authorization')
    const cronSecret = req.headers.get('x-cron-secret')

    const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const validManual = cronSecret === process.env.CRON_SECRET

    if (!validVercel && !validManual) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results = await Promise.allSettled(TARGETS.map(scrapeTarget))

  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) }
  )

  const allSuccess = summary.every((s) => 'success' in s && s.success)

  return NextResponse.json(
    { ok: allSuccess, results: summary },
    { status: allSuccess ? 200 : 207 }
  )
}
