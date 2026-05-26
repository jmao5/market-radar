/**
 * app/api/cron/scrape/route.ts
 *
 * 주식 갤러리 목록 스크래핑 API
 * 개선: upsert 후 신규 게시글 ID를 scrape-detail에 즉시 전달 → 상세 파이프라인 연계
 */

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import type { ScrapeResult } from '@/types/market'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export function parsePostedAt(timeStr: string): string | null {
  const t = timeStr.trim()
  if (!t) return null

  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number)
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const kstDate = kstNow.toISOString().slice(0, 10)
    return new Date(`${kstDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`).toISOString()
  }

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(t)) {
    const [yy, mm, dd] = t.split('.').map(Number)
    return new Date(`${2000 + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+09:00`).toISOString()
  }

  return null
}

interface RawPost {
  post_id: string
  title: string
  author: string | null
  url: string
  view_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  category: string | null
  posted_at: string | null
}

function parseFmkoreaStock(html: string): RawPost[] {
  const $ = cheerio.load(html)
  const posts: RawPost[] = []

  $('table.bd_lst tbody tr').each((_, el) => {
    const $tr = $(el)
    if ($tr.hasClass('notice')) return

    const $titleTd = $tr.find('td.title')
    if ($titleTd.length === 0) return

    const category = $tr.find('td.cate a').first().text().trim() || null
    const $titleLink = $titleTd.find('a').first()
    const title = $titleLink.text().trim()
    const href = $titleLink.attr('href') || ''
    if (!title || !href) return

    const url = href.startsWith('http') ? href : `https://www.fmkorea.com${href}`
    const postIdMatch = href.match(/\/(\d+)(?:\?.*)?$/)
    const post_id = postIdMatch ? postIdMatch[1] : href

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

    posts.push({ post_id, title, author, url, view_count, comment_count, thumbnail_url: null, category, posted_at })
  })

  return posts
}

const TARGETS = [
  { source: 'fmkorea_stock', url: 'https://www.fmkorea.com/stock', parse: parseFmkoreaStock },
]

async function scrapeTarget(target: typeof TARGETS[number]): Promise<ScrapeResult & { newIds?: string[] }> {
  const result: ScrapeResult & { newIds?: string[] } = {
    success: false, inserted: 0, skipped: 0, errors: [],
    source: target.source, scraped_at: new Date().toISOString(),
  }

  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    })

    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); return result }

    const html = await res.text()
    const rawPosts = target.parse(html)
    if (rawPosts.length === 0) { result.errors.push('파싱 결과 0건'); return result }

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    // ── 기존 URL 확인 (신규 판별) ────────────────────────────
    const urls = rawPosts.map((p) => p.url)
    const { data: existing } = await supabase
      .from('forum_posts')
      .select('url')
      .in('url', urls)
    const existingUrls = new Set((existing ?? []).map((e: { url: string }) => e.url))

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
      posted_at: p.posted_at,
      scraped_at: now,
    }))

    const { error } = await supabase
      .from('forum_posts')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false })

    if (error) { result.errors.push(`DB upsert 실패: ${error.message}`); return result }

    // ── 신규 게시글 ID 조회 (즉시 상세 스크래핑용) ──────────
    const newUrls = rawPosts.filter((p) => !existingUrls.has(p.url)).map((p) => p.url)
    if (newUrls.length > 0) {
      const { data: newPosts } = await supabase
        .from('forum_posts')
        .select('id')
        .in('url', newUrls)
      result.newIds = (newPosts ?? []).map((p: { id: string }) => p.id)
    }

    result.inserted = rows.length
    result.skipped = rows.length - (result.newIds?.length ?? 0)
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

  const results = await Promise.allSettled(TARGETS.map(scrapeTarget))
  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) }
  )

  // ── 신규 게시글 즉시 상세 스크래핑 연계 (fire-and-forget) ──
  const allNewIds = summary
    .flatMap((s) => ('newIds' in s ? (s.newIds ?? []) : []))
    .slice(0, 20)

  if (allNewIds.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    // 응답을 기다리지 않음 — 백그라운드 실행
    fetch(`${baseUrl}/api/cron/scrape-detail?ids=${allNewIds.join(',')}`, {
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      cache: 'no-store',
    }).catch(() => {})
  }

  const allSuccess = summary.every((s) => 'success' in s && s.success)
  return NextResponse.json(
    { ok: allSuccess, results: summary, triggered_detail: allNewIds.length },
    { status: allSuccess ? 200 : 207 }
  )
}
