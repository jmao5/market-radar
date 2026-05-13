/**
 * lib/scheduler.ts
 *
 * 스크래핑 스케줄러.
 * instrumentation.ts에서 서버 시작 시 딱 한 번 호출됩니다.
 * 프로덕션(Vercel)에서는 vercel.json cron이 대신하므로 자동으로 비활성화됩니다.
 */

const INTERVAL_MS = 5 * 60 * 1000 // 5분
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let isSchedulerRunning = false

async function runScrape() {
  const now = new Date().toLocaleTimeString('ko-KR')
  try {
    const res = await fetch(`${BASE_URL}/api/cron/scrape`, { cache: 'no-store' })
    const json = await res.json()
    const inserted = json.results?.[0]?.inserted ?? 0
    console.log(`[Scheduler ${now}] 스크래핑 완료 — ${inserted}건 저장`)
  } catch (err) {
    console.error(`[Scheduler ${now}] 스크래핑 실패:`, err)
  }
}

export function startScheduler() {
  // 이미 실행 중이면 중복 등록 방지 (React Strict Mode 등으로 인한 이중 실행 방어)
  if (isSchedulerRunning) return
  isSchedulerRunning = true

  // 프로덕션(Vercel)에서는 vercel.json cron이 담당하므로 여기선 건너뜀
  if (process.env.NODE_ENV === 'production') {
    console.log('[Scheduler] 프로덕션 환경 — Vercel Cron이 대신 실행합니다.')
    return
  }

  console.log(`[Scheduler] 로컬 스케줄러 시작 — ${INTERVAL_MS / 1000 / 60}분 간격`)

  // 서버 시작 후 10초 뒤 첫 실행 (서버가 완전히 뜰 때까지 대기)
  setTimeout(() => {
    runScrape()
    setInterval(runScrape, INTERVAL_MS)
  }, 10_000)
}
