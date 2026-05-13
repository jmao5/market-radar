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
const DETAIL_URL = 'http://localhost:3000/api/cron/scrape-detail?limit=10'
const INTERVAL_MS = 5 * 60 * 1000 // 5분

async function runScrape() {
  const now = new Date().toLocaleTimeString('ko-KR')
  process.stdout.write(`[${now}] 목록 스크래핑 실행 중... `)

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
    return
  }

  // 목록 완료 후 2초 대기 → 상세 스크래핑
  await new Promise((r) => setTimeout(r, 2000))

  const now2 = new Date().toLocaleTimeString('ko-KR')
  process.stdout.write(`[${now2}] 상세 스크래핑 실행 중 (최대 10건)... `)

  try {
    const res2 = await fetch(DETAIL_URL)
    const json2 = await res2.json()

    if (json2.ok) {
      console.log(
        `✅ 완료 (${json2.processed}건 처리, 댓글 ${json2.total_comments}건 저장)`
      )
    } else if (json2.message) {
      console.log(`ℹ️  ${json2.message}`)
    } else {
      const errs = json2.results
        ?.filter((r) => r.errors?.length > 0)
        .map((r) => r.errors.join(', '))
        .join(' | ')
      console.log(`⚠️  부분 실패: ${errs}`)
    }
  } catch (err) {
    console.log(`❌ 상세 오류: ${err.message}`)
  }
}

// 시작 즉시 1회 실행
runScrape()

// 이후 5분 간격 반복
setInterval(runScrape, INTERVAL_MS)

console.log(`🕐 로컬 크론 시작 — ${INTERVAL_MS / 1000 / 60}분 간격으로 스크래핑합니다.`)
console.log('   종료: Ctrl+C\n')
