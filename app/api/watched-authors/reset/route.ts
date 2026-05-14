/**
 * app/api/watched-authors/reset/route.ts
 *
 * 관심 작성자 수집 데이터 초기화 + 즉시 재수집
 *
 * POST /api/watched-authors/reset
 * body: { author?: string, source?: string }
 *   - author 지정 시 해당 작성자만 초기화
 *   - author 없으면 전체 작성자 초기화
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { author, source = 'fmkorea_stock' } = body as {
    author?: string
    source?: string
  }

  const supabase = getAdminClient()

  // 1. 초기화할 작성자 목록 확정
  let authorsToReset: string[] = []

  if (author) {
    authorsToReset = [author]
  } else {
    const { data: watched, error } = await supabase
      .from('watched_authors')
      .select('author')
      .eq('source', source)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    authorsToReset = (watched ?? []).map((w: { author: string }) => w.author)
  }

  if (authorsToReset.length === 0) {
    return NextResponse.json({ ok: true, message: '초기화할 작성자 없음', deleted: 0 })
  }

  // 2. forum_posts에서 해당 작성자 게시글 삭제
  const { error: deleteError, count: deleted } = await supabase
    .from('forum_posts')
    .delete({ count: 'exact' })
    .eq('source', source)
    .in('author', authorsToReset)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // 3. watched_authors last_scraped_at 초기화
  await supabase
    .from('watched_authors')
    .update({ last_scraped_at: null })
    .eq('source', source)
    .in('author', authorsToReset)

  // 4. 즉시 재수집 트리거
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  let rescrapeOk = false
  try {
    const res = await fetch(`${baseUrl}/api/cron/scrape-author`, {
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      cache: 'no-store',
    })
    const json = await res.json()
    rescrapeOk = json.ok ?? false
  } catch {
    // 재수집 실패해도 초기화 결과는 반환
  }

  return NextResponse.json({
    ok: true,
    authors: authorsToReset,
    deleted: deleted ?? 0,
    rescrape_triggered: rescrapeOk,
    message: `${authorsToReset.length}명 초기화 완료, 재수집 ${rescrapeOk ? '시작됨' : '트리거 실패'}`,
  })
}
