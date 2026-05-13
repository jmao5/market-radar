/**
 * scripts/cron-local.mjs
 *
 * 로컬 개발 환경에서 5분마다 스크래핑을 자동 실행합니다.
 * Vercel Cron을 사용할 수 없는 로컬에서만 사용합니다.
 *
 * 실행: node scripts/cron-local.mjs
 * (pnpm dev 와 별도 터미널에서 실행)
 */

const SCRAPE_URL = 'http://localhost:3000/api/cron/scrape'
const INTERVAL_MS = 5 * 60 * 1000 // 5분

async function runScrape() {
  const now = new Date().toLocaleTimeString('ko-KR')
  process.stdout.write(`[${now}] 스크래핑 실행 중... `)

  try {
    const res = await fetch(SCRAPE_URL)
    const json = await res.json()

    if (json.ok) {
      const inserted = json.results?.[0]?.inserted ?? 0
      console.log(`✅ 완료 (${inserted}건 저장)`)
    } else {
      const errors = json.results?.[0]?.errors ?? []
      console.log(`⚠️  부분 실패: ${errors.join(', ')}`)
    }
  } catch (err) {
    console.log(`❌ 오류: ${err.message}`)
    console.log('   → pnpm dev 가 실행 중인지 확인하세요')
  }
}

// 시작 즉시 1회 실행
runScrape()

// 이후 5분 간격 반복
setInterval(runScrape, INTERVAL_MS)

console.log(`🕐 로컬 크론 시작 — ${INTERVAL_MS / 1000 / 60}분 간격으로 스크래핑합니다.`)
console.log('   종료: Ctrl+C\n')
