/**
 * instrumentation.ts
 *
 * Next.js 서버 시작 시 딱 한 번 실행되는 훅.
 * 여기서 스크래핑 스케줄러를 등록하면 pnpm dev 하나만으로 자동 실행됩니다.
 *
 * 로컬: 5분마다 스크래핑
 * 프로덕션(Vercel): vercel.json의 cron이 대신 처리하므로 여기선 비활성화
 */

export async function register() {
  // 서버 사이드에서만 실행 (Edge Runtime 제외)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
