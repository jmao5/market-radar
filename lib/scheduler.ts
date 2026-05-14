/**
 * lib/scheduler.ts
 *
 * 로컬 개발용 자동 스케줄러
 * - 5분마다 목록 스크래핑
 * - 3분마다 상세(본문+댓글) 스크래핑
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
let isSchedulerRunning = false

async function runScrape(label: string, url: string) {
  const now = new Date().toLocaleTimeString('ko-KR')
  process.stdout?.write?.(`[Scheduler ${now}] ${label} 실행 중... `)
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (label === '목록') {
      const inserted = json.results?.[0]?.inserted ?? 0
      console.log(`✅ ${inserted}건 저장`)
    } else {
      console.log(`✅ ${json.succeeded ?? 0}/${json.processed ?? 0}건 처리`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`❌ ${msg}`)
  }
}

export function startScheduler() {
  if (isSchedulerRunning) return
  isSchedulerRunning = true

  if (process.env.NODE_ENV === 'production') {
    console.log('[Scheduler] 프로덕션 — Vercel Cron이 대신 실행합니다.')
    return
  }

  console.log('[Scheduler] 로컬 스케줄러 시작')
  console.log('  · 목록 스크래핑: 1분 간격')
  console.log('  · 상세 스크래핑: 1분 간격\n')

  // 서버 완전 기동 후 10초 뒤 첫 실행
  setTimeout(async () => {
    await runScrape('목록', `${BASE_URL}/api/cron/scrape`)
    setTimeout(() => {
      runScrape('상세', `${BASE_URL}/api/cron/scrape-detail?limit=10`)
    }, 3000)

    // 이후 반복
    setInterval(() => runScrape('목록', `${BASE_URL}/api/cron/scrape`), 1 * 60 * 1000)
    setInterval(() => runScrape('상세', `${BASE_URL}/api/cron/scrape-detail?limit=10`), 1 * 60 * 1000)
  }, 10_000)
}
