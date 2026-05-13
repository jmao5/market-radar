/**
 * lib/scheduler.ts
 *
 * 스크래핑 스케줄러.
 * instrumentation.ts에서 서버 시작 시 딱 한 번 호출됩니다.
 * 프로덕션(Vercel)에서는 vercel.json cron이 대신하므로 자동으로 비활성화됩니다.
 */

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000    // 5분 — 목록 + 상세
const AUTHOR_INTERVAL_MS = 10 * 60 * 1000   // 10분 — 관심 작성자
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let isSchedulerRunning = false

// ── 1단계 + 2단계: 목록 → 상세 ───────────────────────────────
async function runScrape() {
  const now = new Date().toLocaleTimeString('ko-KR')
  try {
    // 1단계: 목록 스크래핑
    const res = await fetch(`${BASE_URL}/api/cron/scrape`, { cache: 'no-store' })
    const json = await res.json()
    const inserted = json.results?.[0]?.inserted ?? 0
    console.log(`[Scheduler ${now}] 목록 완료 — ${inserted}건 저장`)

    // 2단계: 상세 스크래핑 (2초 후)
    await new Promise((r) => setTimeout(r, 2_000))
    const res2 = await fetch(`${BASE_URL}/api/cron/scrape-detail?limit=10`, { cache: 'no-store' })
    const json2 = await res2.json()
    if (json2.message) {
      console.log(`[Scheduler ${now}] 상세 — ${json2.message}`)
    } else {
      console.log(
        `[Scheduler ${now}] 상세 완료 — ${json2.processed}건 처리, 댓글 ${json2.total_comments}건 저장`
      )
    }
  } catch (err) {
    console.error(`[Scheduler ${now}] 실패:`, err)
  }
}

// ── 3단계: 관심 작성자 수집 ──────────────────────────────────
async function runAuthorScrape() {
  const now = new Date().toLocaleTimeString('ko-KR')
  try {
    const res = await fetch(`${BASE_URL}/api/cron/scrape-author`, { cache: 'no-store' })
    const json = await res.json()
    if (json.message) {
      console.log(`[AuthorScheduler ${now}] ${json.message}`)
    } else {
      console.log(
        `[AuthorScheduler ${now}] 완료 — ${json.authors_processed}명 처리, ${json.total_inserted}건 저장`
      )
    }
  } catch (err) {
    console.error(`[AuthorScheduler ${now}] 실패:`, err)
  }
}

export function startScheduler() {
  if (isSchedulerRunning) return
  isSchedulerRunning = true

  // 프로덕션(Vercel)에서는 vercel.json cron이 담당
  if (process.env.NODE_ENV === 'production') {
    console.log('[Scheduler] 프로덕션 환경 — Vercel Cron이 대신 실행합니다.')
    return
  }

  console.log(
    `[Scheduler] 로컬 스케줄러 시작 — 목록 ${SCRAPE_INTERVAL_MS / 60000}분 / 작성자 ${AUTHOR_INTERVAL_MS / 60000}분 간격`
  )

  // 서버 시작 10초 뒤 첫 실행
  setTimeout(() => {
    runScrape()
    setInterval(runScrape, SCRAPE_INTERVAL_MS)

    // 작성자 수집 — 15초 뒤 첫 실행 (목록 스크래핑과 시차)
    setTimeout(() => {
      runAuthorScrape()
      setInterval(runAuthorScrape, AUTHOR_INTERVAL_MS)
    }, 5_000)
  }, 10_000)
}
