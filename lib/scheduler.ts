/**
 * lib/scheduler.ts — 로컬 개발용 스케줄러
 *
 * 개선:
 *   - 목록 완료 즉시 상세 스크래핑 연계 (1분 대기 제거)
 *   - 상세 limit 20으로 증가
 */

import { logger } from '@/lib/logger'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
let isSchedulerRunning = false

async function runScrape(label: string, url: string): Promise<void> {
  const now = new Date().toLocaleTimeString('ko-KR')
  process.stdout?.write?.(`[Scheduler ${now}] ${label} 실행 중... `)
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (label === '목록') {
      const inserted = json.results?.[0]?.inserted ?? 0
      const triggered = json.triggered_detail ?? 0
      logger.info(`목록 ${inserted}건 저장, 신규 ${triggered}건 즉시 상세 처리 중`)
    } else {
      logger.info(`상세 ${json.succeeded ?? 0}/${json.processed ?? 0}건 처리 완료`)
    }
  } catch (err) {
    logger.error(`[Scheduler] ${label} 실패`, err)
  }
}

async function runPipeline(): Promise<void> {
  // 목록 먼저 → 완료되면 잔여 미처리 건 상세 스크래핑
  await runScrape('목록', `${BASE_URL}/api/cron/scrape`)
  // 목록에서 신규 건은 fire-and-forget으로 이미 연계됨
  // 여기서는 기존 미처리 건(backlog) 소화
  await runScrape('상세(backlog)', `${BASE_URL}/api/cron/scrape-detail?limit=20`)
}

export function startScheduler(): void {
  if (isSchedulerRunning) return
  isSchedulerRunning = true

  if (process.env.NODE_ENV === 'production') {
    logger.info('[Scheduler] 프로덕션 — Vercel Cron이 대신 실행합니다.')
    return
  }

  logger.info('[Scheduler] 로컬 스케줄러 시작')
  logger.info('  · 목록 + 즉시 상세 연계: 1분 간격')
  logger.info('  · backlog 상세 처리: 1분 간격 (병렬 4건씩, 20건/회)')

  // 서버 기동 후 10초 뒤 첫 실행
  setTimeout(async () => {
    await runPipeline()
    setInterval(runPipeline, 60_000)
  }, 10_000)
}
